import express from "express";
import dotenv from "dotenv";
import { runGenerator } from "./scripts/generate.js";

dotenv.config();

const app = express();
app.use(express.static("public"));

app.get("/generate", async (req, res) => {
  try {
    const result = await runGenerator();
    res.json({ success: true, message: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
