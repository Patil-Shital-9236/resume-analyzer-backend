const logger = require('../utils/logger');
const pool = require("../config/db");
const calculateMatchScore = require("./matchService");

async function analyzeResume(resumeId, jdId, resumeText) {
  try {

    // 1. Calculate similarity score
    const matchScore = await calculateMatchScore(resumeText, jdId);

    // 2. Save analysis report
    const query = `
      INSERT INTO analysis_reports (
        resume_id,
        jd_id,
        processing_status,
        overall_match_score,
        completed_at
      )
      VALUES ($1, $2, 'completed', $3, NOW())
      RETURNING *;
    `;

    const values = [resumeId, jdId, matchScore];

    const result = await pool.query(query, values);

    return result.rows[0];

  } catch (error) {
    logger.error("Resume analysis failed:", error);
    throw error;
  }
}

module.exports = analyzeResume;