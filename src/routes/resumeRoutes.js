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
   MULTER CONFIG (VERCEL COMPATIBLE)
-------------------------- */
const storage = multer.memoryStorage();

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
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/* -------------------------
   UPLOAD ROUTE
-------------------------- */
router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    logger.info("📦 BODY keys:", Object.keys(req.body || {}));
    logger.info("📂 FILE:", req.file ? req.file.originalname : "No file");

    let parsedContent = req.body ? req.body.parsedContent : "";
    let fileName = req.body ? req.body.fileName : "";
    let fileType = req.body ? req.body.fileType : "";

    // FAST PATH: Client extracted text directly in browser (payload is ~2KB, instant)
    if (parsedContent && typeof parsedContent === "string" && parsedContent.trim().length > 0) {
      fileName = fileName || (req.file ? req.file.originalname : "resume.pdf");
      fileType = fileType || (fileName.endsWith(".docx") ? "docx" : "pdf");
    } else if (req.file) {
      // FALLBACK: Server-side text extraction from uploaded buffer
      fileName = req.file.originalname;
      const fileBuffer = req.file.buffer;
      fileType = req.file.mimetype.includes("pdf") ? "pdf" : "docx";

      if (fileType === "pdf") {
        try {
          const pdfData = await pdfParse(fileBuffer, { max: 5 });
          parsedContent = pdfData.text || "";
        } catch (pdfErr) {
          logger.warn("⚠️ pdfParse failed, using buffer fallback:", pdfErr.message);
          parsedContent = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        }
      } else if (fileType === "docx") {
        try {
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          parsedContent = docxData.value || "";
        } catch (docxErr) {
          logger.warn("⚠️ docx parsing failed, using buffer fallback:", docxErr.message);
          parsedContent = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
        }
      }
    } else {
      return res.status(400).json({
        error: "No resume file or text provided",
      });
    }

    let resumeId = null;
    let userId = req.body ? req.body.userId : null;
    if (userId === "null" || userId === "undefined" || !userId) {
      userId = null;
    }

    if (userId) {
      pool.query(`UPDATE resumes SET is_latest = FALSE WHERE user_id = $1`, [userId]).catch(e => {
        logger.warn("⚠️ UPDATE is_latest warning:", e.message);
      });
    }

    // Insert resume immediately without sending megabytes of base64 over the database connection
    const dbResult = await pool.query(
      `INSERT INTO resumes (user_id, file_name, file_type, parsed_content, file_url, is_latest)
       VALUES ($1, $2, $3, $4, 'processing', TRUE) RETURNING id`,
      [userId, fileName, fileType, parsedContent]
    );

    if (dbResult.rows && dbResult.rows.length > 0) {
      resumeId = dbResult.rows[0].id;
    }

    // If binary file was provided, save base64 preview asynchronously
    if (req.file && resumeId) {
      const fileBuffer = req.file.buffer;
      const mime = req.file.mimetype;
      setImmediate(async () => {
        try {
          const base64Str = fileBuffer.toString("base64");
          const fileUrl = `data:${mime};base64,${base64Str}`;
          await pool.query(
            `UPDATE resumes SET file_url = $1 WHERE id = $2`,
            [fileUrl, resumeId]
          );
          logger.info(`✅ Resume preview cached in background for id: ${resumeId}`);
        } catch (bgErr) {
          logger.warn("⚠️ Background fileUrl update warning:", bgErr.message);
        }
      });
    }

    return res.json({
      success: true,
      message: "✅ File uploaded successfully",
      resumeId: resumeId || ("temp-" + Date.now()),
      file: {
        name: fileName,
        path: "memory",
        type: fileType,
        size: parsedContent.length,
      },
    });

  } catch (err) {
    logger.error("❌ Upload error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process resume file"
    });
  }
});

module.exports = router;