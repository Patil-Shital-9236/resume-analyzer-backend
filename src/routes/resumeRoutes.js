const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

const pool = require("../config/db");
const extractSkills = require("../services/skillExtractor");
const extractEducation = require("../services/educationExtractor");
const extractExperience = require("../services/experienceExtractor");
const { generateEmbedding } = require("../services/embedding");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadToCloudinary = (buffer, originalname, fileType) => {
  return new Promise((resolve, reject) => {
    const nameWithoutExt = originalname.replace(/\.[^/.]+$/, "");
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "resumes",
        public_id: `${Date.now()}_${safeName}.${fileType}`,
        type: "upload",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ error: "Resume file required" });

    let parsedText = "";
    let fileType = "";
    let fileUrl = "";
    let s3Key = "";

    if (req.file.originalname.toLowerCase().endsWith(".pdf")) {
      fileType = "pdf";
      const data = await pdfParse(req.file.buffer);
      parsedText = data.text;
      // Store PDF as base64 directly — no Cloudinary needed
      const base64 = req.file.buffer.toString("base64");
      fileUrl = `data:application/pdf;base64,${base64}`;
      s3Key = "base64_pdf";
    } else if (req.file.originalname.toLowerCase().endsWith(".docx")) {
      fileType = "docx";
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      parsedText = result.value;
      // Upload DOCX to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname,
        fileType
      );
      fileUrl = cloudinaryResult.secure_url;
      s3Key = cloudinaryResult.public_id;
    } else {
      return res.status(400).json({ error: "Only PDF and DOCX files allowed" });
    }

    parsedText = parsedText.toLowerCase();

    const skills = await extractSkills(parsedText);
    const education = extractEducation(parsedText);
    const experience = extractExperience(parsedText);
    const structuredData = { skills, education, experience };

    const MAX_LENGTH = 8000;
    const embedding = await generateEmbedding(parsedText.slice(0, MAX_LENGTH));

    if (!embedding) {
      console.warn("⚠️ Embedding generation failed, storing NULL");
    } else {
      console.log("✅ Resume embedding generated, length:", embedding.length);
    }

    const query = `
      INSERT INTO resumes
      (user_id, file_name, s3_key, file_url, file_type, parsed_content, structured_data, embedding)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      userId,
      req.file.originalname,
      s3Key,
      fileUrl,
      fileType,
      parsedText,
      JSON.stringify(structuredData),
      embedding,
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: "Resume uploaded and analyzed",
      resumeId: result.rows[0].id,
      fileUrl: fileUrl,
      embeddingStored: !!embedding,
      analysis: structuredData,
    });

  } catch (error) {
    console.error("Resume upload failed:", error);
    res.status(500).json({ error: "Resume processing failed" });
  }
});

router.get("/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      "SELECT id, file_name, file_type, file_url, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json({ resumes: result.rows });
  } catch (error) {
    console.error("Failed to fetch resumes:", error);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

module.exports = router;