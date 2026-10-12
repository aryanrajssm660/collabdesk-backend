const express = require("express");
const router = express.Router();
const genAI = require("../config/gemini");
const tasks =require("../controllers/tasks");
const { protect } = require("../middleware/authMiddleware");
router.post("/generate-subtasks", protect,tasks);

module.exports = router;