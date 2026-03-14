const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/*
Generate semantic embedding for resume or job description
We convert text → numeric vector (length 64)
*/

async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text is empty");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const prompt = `
Convert the following text into a numeric vector of length 64.

Rules:
- Return ONLY numbers
- Separate numbers with commas
- Do NOT return text or explanation
- Exactly 64 numbers

Text:
${text}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    // Convert string → numeric array
    const vector = response
      .replace(/\n/g, "")
      .split(",")
      .map(v => parseFloat(v.trim()))
      .filter(v => !isNaN(v));

    // Ensure vector length = 64
    if (vector.length !== 64) {
      throw new Error("Invalid embedding size returned by Gemini");
    }

    return vector;

  } catch (error) {

    console.error("Gemini embedding failed:", error.message);

    /*
    Fallback embedding (simple deterministic vector)
    Ensures system never crashes
    */

    const size = 64;
    const vector = new Array(size).fill(0);

    for (let i = 0; i < text.length; i++) {
      vector[i % size] += text.charCodeAt(i) / 255;
    }

    return vector;
  }
}

module.exports = generateEmbedding;