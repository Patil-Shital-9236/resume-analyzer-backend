const logger = require('../utils/logger');
const axios = require("axios");

async function generateEmbedding(text) {

  try {

    const cleanText = text.slice(0, 2000).replace(/\n+/g, " ").trim();

    // ✅ Correct URL: model path THEN /pipeline/feature-extraction at the end
    const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
    const API_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`;

    const response = await axios.post(
      API_URL,
      {
        inputs: cleanText,
        options: { wait_for_model: true }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const result = response.data;
    const embedding = extractEmbedding(result);

    if (!embedding) {
      logger.error("Unexpected embedding shape:", JSON.stringify(result)?.slice(0, 200));
      return null;
    }

    logger.info("✅ Embedding generated, length:", embedding.length);
    return embedding;

  } catch (error) {

    logger.error("Embedding error:", error.response?.data || error.message);
    return null;

  }

}

function extractEmbedding(data) {

  // Case 1: Flat number array → [384]
  if (Array.isArray(data) && typeof data[0] === "number") {
    return data;
  }

  // Case 2: [[vec1], [vec2], ...] batch → take first
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === "number") {
    // If it's a batch of sentence embeddings, return first
    if (data.length === 1) return data[0];
    // If it's token-level embeddings, mean pool
    return meanPool(data);
  }

  // Case 3: [1, tokens, 384] — unwrap batch dim
  if (Array.isArray(data) && Array.isArray(data[0]) && Array.isArray(data[0][0])) {
    return meanPool(data[0]);
  }

  return null;

}

function meanPool(tokenVectors) {

  if (!tokenVectors || tokenVectors.length === 0) return null;

  const dim = tokenVectors[0].length;
  const mean = new Array(dim).fill(0);

  for (const vec of tokenVectors) {
    for (let i = 0; i < dim; i++) {
      mean[i] += vec[i];
    }
  }

  return mean.map(v => v / tokenVectors.length);

}

module.exports = { generateEmbedding };