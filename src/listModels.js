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
      console.log("No models returned");
      return;
    }

    data.models.forEach((m) => {
      console.log(m.name);
      if (m.supportedGenerationMethods)
        console.log("Methods:", m.supportedGenerationMethods);
      console.log("------------");
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

listModels();