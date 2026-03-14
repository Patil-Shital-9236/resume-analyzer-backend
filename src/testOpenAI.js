require("dotenv").config();
const client = require("./utils/openaiClient");

async function testEmbedding() {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: "Test resume for AI analyzer"
    });

    console.log("Embedding created!");
    console.log("Vector length:", response.data[0].embedding.length);
  } catch (error) {
    console.error("OpenAI Error:", error.message);
  }
}

testEmbedding();