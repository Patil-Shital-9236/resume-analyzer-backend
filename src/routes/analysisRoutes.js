const logger = require('../utils/logger');
const express = require("express");
const router = express.Router();

const { analyzeResume } = require("../services/geminiService");

router.post("/", async (req, res) => {
  try {

    const { resumeText, jdText } = req.body;

    if (!resumeText || !jdText) {
      return res.status(400).json({
        error: "Resume text and JD text are required"
      });
    }

    const result = await analyzeResume(resumeText, jdText);

    res.json({
      success: true,
      result: result
    });

  } catch (error) {

    logger.error("Analysis error:", error);

    res.status(500).json({
      error: "AI analysis failed"
    });
  }
});

module.exports = router;