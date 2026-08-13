const logger = require('../utils/logger');
const pool = require("../config/db");
const generateEmbedding = require("./embeddingService");
const cosineSimilarity = require("../utils/cosineSimilarity");

async function calculateMatchScore(resumeText, jdId) {
  try {

    // 1. Generate embedding for resume
    const resumeEmbedding = await generateEmbedding(resumeText);

    // 2. Fetch job description embedding from DB
    const result = await pool.query(
      `SELECT embedding FROM job_descriptions WHERE id = $1`,
      [jdId]
    );

    if (result.rows.length === 0) {
      throw new Error("Job description not found");
    }

    const jdEmbedding = JSON.parse(result.rows[0].embedding);

    // 3. Calculate similarity
    const similarity = cosineSimilarity(resumeEmbedding, jdEmbedding);

    // Convert to percentage
    const matchScore = (similarity * 100).toFixed(2);

    return matchScore;

  } catch (error) {
    logger.error("Match calculation failed:", error);
    throw error;
  }
}

module.exports = calculateMatchScore;