const logger = require('./utils/logger');
require("dotenv").config();
const ai = require("./config/gemini");

async function testEmbedding() {
  try {

    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [{
        role: "user",
        parts: [{ text: "Software engineer with Node.js and React experience" }]
      }]
    });

    const embedding = response.embeddings[0].values;

    logger.info("Embedding size:", embedding.length);
    logger.info("First 10 values:", embedding.slice(0,10));

  } catch (error) {
    logger.error("Gemini Test Error:", error.message);
  }
}

testEmbedding();