const logger = require('../utils/logger');
require("dotenv").config();

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const pool = require("../config/db");

const router = express.Router();

/* -------------------------
   ENSURE UPLOAD FOLDER
-------------------------- */
const uploadDir = "uploads/";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  logger.info("📁 uploads folder created");
}

/* -------------------------
   MULTER CONFIG
-------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, Date.now() + "_" + safeName);
  },
});

/* -------------------------
   FILE FILTER (PDF + DOCX ONLY)
-------------------------- */
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are allowed"), false);
  }
};

/* -------------------------
   MULTER INSTANCE
-------------------------- */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/* -------------------------
   UPLOAD ROUTE
-------------------------- */
router.post("/upload", (req, res) => {

  const uploadSingle = upload.single("resume");

  uploadSingle(req, res, (err) => {

    logger.info("📦 BODY:", req.body);
    logger.info("📂 FILE:", req.file);

    /* -------------------------
       MULTER ERRORS
    -------------------------- */
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (err) {
      return res.status(400).json({
        error: err.message,
      });
    }

    /* -------------------------
       FILE CHECK
    -------------------------- */
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    /* -------------------------
       EXTRACT TEXT & SAVE TO DB
    -------------------------- */
    (async () => {
      try {
        let parsedContent = "";
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "docx";

        if (fileType === "pdf") {
          const pdfData = await pdfParse(fileBuffer);
          parsedContent = pdfData.text;
        } else if (fileType === "docx") {
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          parsedContent = docxData.value;
        }

        let resumeId = null;
        const userId = req.body.userId;

        if (userId) {
          // Set previous resumes as not latest
          await pool.query(`UPDATE resumes SET is_latest = FALSE WHERE user_id = $1`, [userId]);

          // Insert new resume
          const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
          const dbResult = await pool.query(
            `INSERT INTO resumes (user_id, file_name, file_type, parsed_content, s3_key, is_latest)
             VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
            [userId, req.file.originalname, fileType, parsedContent, fileUrl]
          );

          if (dbResult.rows.length > 0) {
            resumeId = dbResult.rows[0].id;
          }
        }

        res.json({
          success: true,
          message: "✅ File uploaded successfully",
          resumeId,
          file: {
            name: req.file.filename,
            path: req.file.path,
            type: req.file.mimetype,
            size: req.file.size,
          },
        });

      } catch (dbErr) {
        logger.error("❌ DB insert error during resume upload:", dbErr);
        res.status(500).json({
          error: "Failed to process resume file"
        });
      }
    })();

  });

});

module.exports = router;