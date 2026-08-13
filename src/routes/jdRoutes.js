const logger = require('../utils/logger');
const express = require("express");
const pool = require("../config/db");
const generateEmbedding = require("../services/embeddingService");

const router = express.Router();

/*
POST /api/jd

Body:
{
  "userId": "uuid",
  "title": "Software Engineer",
  "company": "Google",
  "rawText": "Full job description text"
}
*/

router.post("/", async (req, res) => {
  try {
    const { userId, title, company, rawText } = req.body;

    if (!userId || !rawText) {
      return res.status(400).json({
        error: "userId and rawText are required"
      });
    }

    // Generate embedding
    const embedding = await generateEmbedding(rawText);

    const embeddingString = JSON.stringify(embedding);

    const query = `
      INSERT INTO job_descriptions (user_id, title, company, raw_text, embedding)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [userId, title, company, rawText, embeddingString];

    const result = await pool.query(query, values);

    res.json({
      message: "Job description stored",
      jobDescription: result.rows[0]
    });

  } catch (error) {
    logger.error("JD creation failed:", error);
    res.status(500).json({
      error: "Failed to store job description"
    });
  }
});

module.exports = router;