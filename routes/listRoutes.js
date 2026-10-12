const express = require("express");
const router = express.Router();
const List = require("../models/List");
const Task = require("../models/Task");
const { protect } = require("../middleware/authMiddleware");

// Create a new list (column) in a workspace
router.post("/", protect, async (req, res) => {
  try {
    const { name, workspace } = req.body;
    if (!name || !workspace) {
      return res.status(400).json({ message: "name and workspace are required" });
    }

    const count = await List.countDocuments({ workspace });
    const list = await List.create({ name, workspace, position: count });

    const io = req.app.get("io");
    io.emit("listCreated", list);

    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all lists for a workspace, ordered
router.get("/workspace/:workspaceId", protect, async (req, res) => {
  try {
    const lists = await List.find({ workspace: req.params.workspaceId }).sort("position");
    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk reorder lists (drag-and-drop of columns)
router.put("/reorder", protect, async (req, res) => {
  try {
    const { updates } = req.body; // [{ _id, position }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "updates array is required" });
    }

    await Promise.all(
      updates.map((u) => List.findByIdAndUpdate(u._id, { position: u.position }))
    );

    const io = req.app.get("io");
    io.emit("listsReordered", updates);

    res.json({ message: "Lists reordered" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rename a list
router.put("/:id", protect, async (req, res) => {
  try {
    const { name } = req.body;
    const list = await List.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!list) return res.status(404).json({ message: "List not found" });

    const io = req.app.get("io");
    io.emit("listUpdated", list);

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a list and all tasks inside it
router.delete("/:id", protect, async (req, res) => {
  try {
    const list = await List.findByIdAndDelete(req.params.id);
    if (!list) return res.status(404).json({ message: "List not found" });

    const deletedTasks = await Task.find({ list: list._id }, "_id");
    await Task.deleteMany({ list: list._id });

    const io = req.app.get("io");
    io.emit("listDeleted", { _id: list._id, workspace: list.workspace });
    deletedTasks.forEach((t) =>
      io.emit("taskDeleted", { _id: t._id, workspace: list.workspace })
    );

    res.json({ message: "List deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
