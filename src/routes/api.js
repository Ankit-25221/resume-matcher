/**
 * API Routes
 */

const express = require("express");
const multer  = require("multer");
const router  = express.Router();

const { parseResume }          = require("../parsers/resumeParser");
const { parseJD }              = require("../parsers/jdParser");
const { matchResumeToJDs }     = require("../matchers/matchingEngine");
const { extractTextFromBuffer } = require("../utils/fileExtractor");

const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and TXT files are allowed"), false);
  },
});

// ── Health Check ──────────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Parse Resume Only ─────────────────────────────────────────────────────────
router.post("/parse/resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required (PDF or TXT)" });
    }
    const text   = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    const parsed = parseResume(text);
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Parse JD Only ─────────────────────────────────────────────────────────────
router.post("/parse/jd", upload.single("jd"), async (req, res) => {
  try {
    let text        = "";
    const jobId     = req.body.jobId || "JD001";

    if (req.file) {
      text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    } else if (req.body.text) {
      text = req.body.text;
    } else {
      return res.status(400).json({ error: "JD file or text body is required" });
    }

    const parsed        = parseJD(text, jobId);
    const { rawText, ...result } = parsed;
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Match via File Upload ─────────────────────────────────────────────────────
router.post(
  "/match",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jds",    maxCount: 20 },
  ]),
  async (req, res) => {
    try {
      let resumeText = "";

      if (req.files && req.files["resume"]) {
        const resumeFile = req.files["resume"][0];
        resumeText = await extractTextFromBuffer(resumeFile.buffer, resumeFile.mimetype);
      } else if (req.body.resumeText) {
        resumeText = req.body.resumeText;
      } else {
        return res.status(400).json({ error: "Resume file or resumeText is required" });
      }

      const parsedResume = parseResume(resumeText);
      const parsedJDs    = [];

      if (req.files && req.files["jds"]) {
        for (let i = 0; i < req.files["jds"].length; i++) {
          const jdFile = req.files["jds"][i];
          const jdText = await extractTextFromBuffer(jdFile.buffer, jdFile.mimetype);
          const jobId  = `JD${String(i + 1).padStart(3, "0")}`;
          parsedJDs.push(parseJD(jdText, jobId));
        }
      }

      if (req.body.jdTexts) {
        try {
          const jdArray = JSON.parse(req.body.jdTexts);
          for (const jdItem of jdArray) {
            parsedJDs.push(parseJD(jdItem.text, jdItem.jobId || `JD${parsedJDs.length + 1}`));
          }
        } catch (e) {
          return res.status(400).json({ error: "jdTexts must be a valid JSON array" });
        }
      }

      if (parsedJDs.length === 0) {
        return res.status(400).json({ error: "At least one JD is required" });
      }

      const result = matchResumeToJDs(parsedResume, parsedJDs);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── Match via Raw Text (JSON body) ────────────────────────────────────────────
router.post("/match/text", express.json({ limit: "2mb" }), (req, res) => {
  try {
    const { resumeText, jds } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: "resumeText is required" });
    }
    if (!jds || !Array.isArray(jds) || jds.length === 0) {
      return res.status(400).json({ error: "jds array is required" });
    }

    const parsedResume = parseResume(resumeText);
    const parsedJDs    = jds.map((jd, i) =>
      parseJD(jd.text, jd.jobId || `JD${String(i + 1).padStart(3, "0")}`)
    );

    const result = matchResumeToJDs(parsedResume, parsedJDs);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;