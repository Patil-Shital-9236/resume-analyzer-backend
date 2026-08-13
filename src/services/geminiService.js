const logger = require('../utils/logger');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const extractSkills = require("./skillExtractor");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "fallback_key");

async function analyzeResume(resumeText, jdText) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
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
  "match_score": 75,
  "skills_match_percentage": 75,
  "experience_match_percentage": 70,
  "education_match_percentage": 80,
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
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(text);

  } catch (error) {
    logger.warn("⚠️ Gemini API call failed (" + error.message + "), using Intelligent Local ATS Analyzer.");

    // Local Fallback ATS Skill & Alignment Analysis
    const resumeSkills = await extractSkills(resumeText);
    const jdSkills = await extractSkills(jdText);

    const matchedSkills = resumeSkills.filter(s => jdSkills.includes(s));
    const missingSkills = jdSkills.filter(s => !resumeSkills.includes(s));

    const skillsMatchPercentage = jdSkills.length > 0
      ? Math.round((matchedSkills.length / jdSkills.length) * 100)
      : (resumeSkills.length > 0 ? 80 : 50);

    const matchScore = Math.min(100, Math.max(30, skillsMatchPercentage));

    const summary = `Resume candidate has ${resumeSkills.length} extracted skills (${matchedSkills.length} matching required role). Overall qualification match score is ${matchScore}%.`;

    const weaknesses = [];
    if (missingSkills.length > 0) {
      weaknesses.push(`Missing key required skills: ${missingSkills.slice(0, 4).join(", ")}`);
    }
    if (resumeSkills.length < 5) {
      weaknesses.push("Low total count of technical skills listed on resume");
    }

    const improvementPlan = [];
    missingSkills.forEach(skill => {
      improvementPlan.push(`Gain practical experience or add projects demonstrating ${skill}`);
    });
    if (improvementPlan.length === 0) {
      improvementPlan.push("Highlight quantifiable achievements and metrics for your past project experience.");
    }

    return {
      extracted_resume_skills: resumeSkills,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      match_score: matchScore,
      skills_match_percentage: skillsMatchPercentage,
      experience_match_percentage: 70,
      education_match_percentage: 80,
      summary,
      weaknesses,
      improvement_plan: improvementPlan
    };
  }
}

module.exports = {
  analyzeResume
};