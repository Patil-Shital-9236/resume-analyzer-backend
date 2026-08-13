const logger = require('./utils/logger');
require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

async function listModels() {
  try {
    const url =
      "https://generativelanguage.googleapis.com/v1/models?key=" +
      process.env.GEMINI_API_KEY;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.models) {
      logger.info("No models returned");
      return;
    }

    data.models.forEach((m) => {
      logger.info(m.name);
      if (m.supportedGenerationMethods)
        logger.info("Methods:", m.supportedGenerationMethods);
      logger.info("------------");
    });
  } catch (err) {
    logger.error("Error:", err.message);
  }
}

listModels();