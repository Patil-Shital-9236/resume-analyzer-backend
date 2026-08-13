const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const skillsDB = require("../data/skills");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function extractSkills(text) {

  const resumeText = text.toLowerCase();

  let aiSkills = [];

  /* --------------------------------
     TRY AI SKILL EXTRACTION
  -------------------------------- */

  try {

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `
Extract all technical skills from the following resume.

Return ONLY a JSON array.

Example:
["python","react","node.js","mysql"]

Resume:
${resumeText}
`;

    const result = await model.generateContent(prompt);

    let response = await result.response.text();

    /* ----------------------------
       Clean Gemini formatting
    ---------------------------- */

    response = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {

      const parsed = JSON.parse(response);

      if (Array.isArray(parsed)) {
        aiSkills = parsed.map(s => s.toLowerCase());
      }

    } catch {

      logger.warn("Gemini returned invalid JSON");

    }

  } catch (error) {

    logger.warn("Gemini API failed, using fallback");

  }

  /* --------------------------------
     DATABASE SKILL MATCHING
  -------------------------------- */

  const dbSkills = skillsDB.filter(skill =>
    resumeText.includes(skill)
  );

  /* --------------------------------
     MERGE AI + DB SKILLS
  -------------------------------- */

  const finalSkills = [...new Set([
    ...aiSkills,
    ...dbSkills
  ])];

  return finalSkills;

}

module.exports = extractSkills;