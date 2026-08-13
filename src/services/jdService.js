const logger = require('../utils/logger');

const pool = require("../config/db");
const generateEmbedding = require("./embeddingService");

async function saveJobDescription(userId, title, company, rawText) {
  try {

    // Generate embedding using Gemini
    const embedding = await generateEmbedding(rawText);

    // Convert embedding array → JSON string
    const embeddingString = JSON.stringify(embedding);

    const query = `
      INSERT INTO job_descriptions (user_id, title, company, raw_text, embedding)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [userId, title, company, rawText, embeddingString];

    const result = await pool.query(query, values);

    return result.rows[0];

  } catch (error) {
    logger.error("Error saving job description:", error);
    throw error;
  }
}

module.exports = saveJobDescription;