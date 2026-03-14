const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeResume(resumeText, jdText) {

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
  });

  const prompt = `
You are an AI resume ATS analyzer.

First extract all technical and professional skills from the RESUME.

Then compare them with the JOB DESCRIPTION.

Return ONLY JSON.

{
  "extracted_resume_skills": [],
  "matched_skills": [],
  "missing_skills": [],
  "match_score": number,
  "skills_match_percentage": number,
  "experience_match_percentage": number,
  "education_match_percentage": number,
  "summary": "",
  "weaknesses": [],
  "improvement_plan": []
}

Rules:
- match_score must be between 0 and 100
- skills are the most important factor
- education is the least important factor

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}
`;

  const result = await model.generateContent(prompt);

  let text = result.response.text();

  /* Remove markdown formatting if Gemini adds it */
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();

  return JSON.parse(text);
}

module.exports = {
  analyzeResume
};