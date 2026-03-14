const fs = require("fs");
const pdfParse = require("pdf-parse");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const generateEmbedding = require("../services/embeddingService");
const cosineSimilarity = require("../utils/cosineSimilarity");
const extractSkills = require("../services/skillExtractor");
const extractEducation = require("../services/educationExtractor");
const extractExperience = require("../services/experienceExtractor");
const calculateATSScore = require("../utils/atsScoreCalculator");

const parseResume = async (req, res) => {
  try {

    // ----------------------------
    // Validate Upload
    // ----------------------------
    if (!req.file) {
      return res.status(400).json({
        message: "Resume file is required"
      });
    }

    const filePath = req.file.path;

    // ----------------------------
    // Extract Text from Resume
    // ----------------------------
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    const resumeText = data.text.toLowerCase();

    // delete uploaded file
    fs.unlinkSync(filePath);

    // ----------------------------
    // Extract Skills
    // ----------------------------
    const foundSkills = await extractSkills(resumeText);

    const resumeScore = Math.min(foundSkills.length * 10, 100);

    // ----------------------------
    // Extract Education
    // ----------------------------
    const education = extractEducation(resumeText);

    // ----------------------------
    // Extract Experience
    // ----------------------------
    const experience = extractExperience(resumeText);

    // ----------------------------
    // Detect Resume Sections
    // ----------------------------
    const sections = [];

    if (education.length > 0) sections.push("education");
    if (experience.length > 0) sections.push("experience");
    if (resumeText.includes("project")) sections.push("projects");
    if (resumeText.includes("certification")) sections.push("certifications");
    if (resumeText.includes("skills")) sections.push("skills");

    // ----------------------------
    // Detect Weaknesses
    // ----------------------------
    const weaknesses = [];

    if (!sections.includes("projects"))
      weaknesses.push("No projects mentioned");

    if (!sections.includes("experience"))
      weaknesses.push("No experience section");

    if (foundSkills.length < 5)
      weaknesses.push("Low number of technical skills");

    if (!resumeText.includes("achievement") && !resumeText.includes("improved"))
      weaknesses.push("No measurable achievements");

    // ----------------------------
    // Job Description
    // ----------------------------
    const jobDescription = req.body.jobDescription
      ? req.body.jobDescription.toLowerCase()
      : "";

    let requiredSkills = [];

    if (jobDescription) {
      requiredSkills = await extractSkills(jobDescription);
    }

    // ----------------------------
    // Skill Matching
    // ----------------------------
    const matchedSkills = foundSkills.filter(skill =>
      requiredSkills.includes(skill)
    );

    const missingSkills = requiredSkills.filter(skill =>
      !foundSkills.includes(skill)
    );

    const matchPercentage =
      requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;

    // ----------------------------
    // Semantic Matching
    // ----------------------------
    let semanticScore = 0;

    if (jobDescription) {

      const resumeEmbedding = await generateEmbedding(resumeText);
      const jdEmbedding = await generateEmbedding(jobDescription);

      semanticScore = Math.round(
        cosineSimilarity(resumeEmbedding, jdEmbedding) * 100
      );
    }

    const finalScore = semanticScore || matchPercentage;

    // ----------------------------
    // ATS Score
    // ----------------------------
    const atsScore = calculateATSScore({
      matchedSkills,
      requiredSkills,
      sections
    });

    // ----------------------------
    // Suggestions
    // ----------------------------
    const suggestions = [];

    missingSkills.forEach(skill => {
      suggestions.push(`Add projects or experience using ${skill}`);
    });

    weaknesses.forEach(w => {
      suggestions.push(`Improve: ${w}`);
    });

    // ----------------------------
    // Save Report
    // ----------------------------
    const reportId = uuidv4();

    await pool.query(
      `
      INSERT INTO analysis_reports
      (
        id,
        overall_match_score,
        missing_skills,
        weaknesses,
        improvement_plan,
        processing_status,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [
        reportId,
        finalScore,
        JSON.stringify(missingSkills),
        JSON.stringify(weaknesses),
        JSON.stringify(suggestions),
        "completed"
      ]
    );

    // ----------------------------
    // API Response
    // ----------------------------
    res.json({
      message: "Resume analyzed successfully",

      detectedSkills: foundSkills,
      education,
      experience,

      resumeScore,
      atsScore,

      sections,
      weaknesses,

      requiredSkills,
      matchedSkills,
      missingSkills,

      jobMatchPercentage: matchPercentage,
      semanticMatchScore: semanticScore,

      improvementSuggestions: suggestions
    });

  } catch (error) {

    console.error("Resume parsing error:", error);

    res.status(500).json({
      message: "Error parsing resume"
    });

  }
};

module.exports = { parseResume };