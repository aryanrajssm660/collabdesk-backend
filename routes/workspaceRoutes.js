const express = require("express");
const router = express.Router();
const Workspace = require("../models/Workspace");
const List = require("../models/List");
const { protect } = require("../middleware/authMiddleware");

const DEFAULT_LISTS = [
  { name: "To do", color: "teal" },
  { name: "In progress", color: "blue" },
  { name: "Done", color: "green" },
];

router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;

    const workspace = await Workspace.create({
      name,
      owner: req.user._id,
      members: [req.user._id],
    });

    await List.insertMany(
      DEFAULT_LISTS.map((l, i) => ({
        name: l.name,
        color: l.color,
        workspace: workspace._id,
        position: i,
      }))
    );

    res.status(201).json(workspace);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});
router.get("/", protect, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ members: req.user._id });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/:id", protect, async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      members: req.user._id,
    }).populate("members", "name email");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;