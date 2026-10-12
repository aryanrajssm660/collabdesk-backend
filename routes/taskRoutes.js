const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      description,
      workspace,
      list,
      assignedTo,
      attachmentUrl,
      labels,
      dueDate,
    } = req.body;

    if (!list) {
      return res.status(400).json({ message: "list is required" });
    }

    const count = await Task.countDocuments({ list });

    const task = await Task.create({
      title,
      description,
      workspace,
      list,
      position: count,
      assignedTo,
      attachmentUrl,
      labels,
      dueDate: dueDate || null,
      createdBy: req.user._id,
    });

    const io = req.app.get("io");
    io.emit("taskCreated", task);

    res.status(201).json(task);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

router.get("/workspace/:workspaceId", protect, async (req, res) => {
  try {
    const tasks = await Task.find({ workspace: req.params.workspaceId }).sort("position");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const {
      status,
      title,
      description,
      attachmentUrl,
      assignedTo,
      list,
      position,
      labels,
      dueDate,
      checklist,
    } = req.body;

    const update = {};
    if (status !== undefined) update.status = status;
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (attachmentUrl !== undefined) update.attachmentUrl = attachmentUrl;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (list !== undefined) update.list = list;
    if (position !== undefined) update.position = position;
    if (labels !== undefined) update.labels = labels;
    if (dueDate !== undefined) update.dueDate = dueDate;
    if (checklist !== undefined) update.checklist = checklist;

    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const io = req.app.get("io");
    io.emit("taskUpdated", task);

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk move/reorder tasks (used by drag-and-drop between/within lists)
router.put("/reorder/bulk", protect, async (req, res) => {
  try {
    const { updates } = req.body; // [{ _id, list, position }]
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "updates array is required" });
    }

    await Promise.all(
      updates.map((u) =>
        Task.findByIdAndUpdate(u._id, { list: u.list, position: u.position })
      )
    );

    const io = req.app.get("io");
    io.emit("tasksReordered", updates);

    res.json({ message: "Tasks reordered" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a comment to a task
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            text: text.trim(),
            author: req.user._id,
            authorName: req.user.name,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    const io = req.app.get("io");
    io.emit("taskUpdated", task);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (task) {
      const io = req.app.get("io");
      io.emit("taskDeleted", { _id: task._id, workspace: task.workspace });
    }

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
