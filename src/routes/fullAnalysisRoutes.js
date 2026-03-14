const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const pool = require("../config/db");
const { analyzeResume } = require("../services/geminiService");
const { generateEmbedding } = require("../services/embedding");
const router = express.Router();

/* ---------------- FILE UPLOAD ---------------- */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* ---------------- ROUTE ---------------- */

router.post("/", upload.single("resume"), async (req, res) => {

  try {

    const { userId, jdText, title, company, resumeId } = req.body;

    /* -------- VALIDATION -------- */

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!jdText) {
      return res.status(400).json({ error: "Job description required" });
    }

    let resumeText = "";
    let finalResumeId = null;

    /* -------- CASE 1: resumeId provided → reuse existing resume -------- */

    if (resumeId) {

      const existing = await pool.query(
        `SELECT id, parsed_content FROM resumes WHERE id = $1 AND user_id = $2`,
        [resumeId, userId]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Resume not found for this user" });
      }

      resumeText   = existing.rows[0].parsed_content;
      finalResumeId = existing.rows[0].id;

      console.log("✅ Reusing existing resume id:", finalResumeId);

    }

    /* -------- CASE 2: No resumeId → fresh file upload -------- */

    else {

      if (!req.file) {
        return res.status(400).json({ error: "Resume file or resumeId is required" });
      }

      /* ---- Extract Text ---- */

      if (req.file.mimetype === "application/pdf") {

        const data = await pdfParse(req.file.buffer);
        resumeText = data.text;

      } else if (
        req.file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {

        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        resumeText = result.value;

      } else {

        return res.status(400).json({ error: "Only PDF or DOCX allowed" });

      }

      /* ---- File Type ---- */

      const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "docx";

      /* ---- Generate Resume Embedding ---- */

      const MAX_LENGTH = 8000;
      const resumeEmbedding = await generateEmbedding(resumeText.slice(0, MAX_LENGTH));

      if (!resumeEmbedding) {
        console.warn("⚠️ Resume embedding failed, storing NULL");
      }

      /* ---- Insert New Resume ---- */

      const resumeResult = await pool.query(
        `INSERT INTO resumes
        (user_id, file_name, s3_key, file_type, parsed_content, structured_data, embedding)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id`,
        [
          userId,
          req.file.originalname,
          "local-storage",
          fileType,
          resumeText,
          JSON.stringify({}),        // structured_data filled after analysis below
          resumeEmbedding
        ]
      );

      finalResumeId = resumeResult.rows[0].id;
      console.log("✅ New resume inserted, id:", finalResumeId);

    }

    /* -------- Generate JD Embedding -------- */

    const MAX_LENGTH = 8000;
    const jdEmbedding = await generateEmbedding(jdText.slice(0, MAX_LENGTH));

    if (!jdEmbedding) {
      console.warn("⚠️ JD embedding failed, storing NULL");
    }

    /* -------- Run AI Analysis -------- */

    const analysis = await analyzeResume(resumeText, jdText);

    /* -------- Update structured_data on resume (skills from analysis) -------- */

    await pool.query(
      `UPDATE resumes SET structured_data = $1 WHERE id = $2`,
      [
        JSON.stringify({ skills: analysis.extracted_resume_skills }),
        finalResumeId
      ]
    );

    /* -------- Save Job Description -------- */

    const jdResult = await pool.query(
      `INSERT INTO job_descriptions
      (user_id, title, company, raw_text, embedding)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id`,
      [
        userId,
        title   || "Unknown Role",
        company || "Unknown Company",
        jdText,
        jdEmbedding
      ]
    );

    const jdId = jdResult.rows[0].id;

    /* -------- Save Analysis Report -------- */

    await pool.query(
      `INSERT INTO analysis_reports
      (
        resume_id,
        jd_id,
        processing_status,
        overall_match_score,
        alignment_summary,
        missing_skills,
        weaknesses,
        improvement_plan,
        completed_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [
        finalResumeId,
        jdId,
        "completed",
        analysis.match_score,
        analysis.summary,
        JSON.stringify(analysis.missing_skills),
        JSON.stringify(analysis.weaknesses),
        JSON.stringify(analysis.improvement_plan)
      ]
    );

    /* -------- RESPONSE -------- */

    res.json({
      success: true,
      resumeId: finalResumeId,
      jdId,
      analysis
    });

  } catch (error) {

    console.error("Analysis failed:", error);
    res.status(500).json({ error: "Analysis failed" });

  }

});

module.exports = router;
