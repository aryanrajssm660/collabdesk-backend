
const genAI = require("../config/gemini");
const  tasks= async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Break down this task into 4-6 short, actionable subtasks. Task: "${description}". Return ONLY a JSON array of strings, no other text. Example format: ["Subtask 1", "Subtask 2"]`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanedText = responseText.replace(/```json|```/g, "").trim();
    const subtasks = JSON.parse(cleanedText);

    res.json({ subtasks });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
}

module.exports=tasks;