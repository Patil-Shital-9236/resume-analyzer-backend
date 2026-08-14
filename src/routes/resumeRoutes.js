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
        const fileBuffer = req.file.buffer;
        const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "docx";

        if (fileType === "pdf") {
          const pdfData = await pdfParse(fileBuffer);
          parsedContent = pdfData.text;
        } else if (fileType === "docx") {
          const docxData = await mammoth.extractRawText({ buffer: fileBuffer });
          parsedContent = docxData.value;
        }

        let resumeId = null;
        let userId = req.body.userId;
        if (userId === "null" || userId === "undefined" || !userId) {
          userId = null;
        }

        if (userId) {
          // Set previous resumes as not latest
          await pool.query(`UPDATE resumes SET is_latest = FALSE WHERE user_id = $1`, [userId]);
        }

        // We use a processing placeholder for now so the upload is instant.
        const fileUrl = "processing";
        
        const dbResult = await pool.query(
          `INSERT INTO resumes (user_id, file_name, file_type, parsed_content, file_url, is_latest)
           VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
          [userId, req.file.originalname, fileType, parsedContent, fileUrl]
        );

        if (dbResult.rows.length > 0) {
          resumeId = dbResult.rows[0].id;
        }

        res.json({
          success: true,
          message: "✅ File uploaded successfully",
          resumeId,
          file: {
            name: req.file.originalname,
            path: "memory",
            type: req.file.mimetype,
            size: req.file.size,
          },
        });

        // -------------------------
        // BACKGROUND SAVE
        // -------------------------
        // The DB insert for a massive 5MB base64 string can take several seconds over a remote network.
        // We do it asynchronously *after* sending the response so the user isn't blocked.
        if (resumeId) {
          setImmediate(async () => {
            try {
              const base64Str = fileBuffer.toString("base64");
              const finalUrl = `data:${req.file.mimetype};base64,${base64Str}`;
              await pool.query(
                `UPDATE resumes SET file_url = $1 WHERE id = $2`,
                [finalUrl, resumeId]
              );
              logger.info(`✅ Background save complete for resume ${resumeId}`);
            } catch (err) {
              logger.error("❌ Background save failed:", err);
            }
          });
        }

      } catch (dbErr) {
        logger.error("❌ DB insert error during resume upload:", dbErr);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Failed to process resume file"
          });
        }
      }
    })();

  });

});

module.exports = router;