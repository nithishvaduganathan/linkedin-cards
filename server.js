import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { runGenerator } from "./scripts/auto-generate.js";

dotenv.config();

const app = express();
app.use(express.static("public"));

const CARDS_DIR = path.join(process.cwd(), "cards");

/* Generate cards */
app.get("/generate", async (req, res) => {
  try {
    await runGenerator();
    res.json({ success: true, message: "Cards generated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* Download cards as ZIP */
app.get("/download", (req, res) => {
  if (!fs.existsSync(CARDS_DIR)) {
    return res.status(404).json({ message: "No cards found" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=linkedin-cards.zip");

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(CARDS_DIR, false);
  archive.finalize();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
