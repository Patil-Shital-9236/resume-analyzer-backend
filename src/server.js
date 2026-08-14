require("dotenv").config();
if (process.env.NODE_ENV !== 'production') {
  require("./tracing");
}

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const jdRoutes = require("./routes/jdRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const fullAnalysisRoutes = require("./routes/fullAnalysisRoutes");
const userRoutes = require("./routes/userRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");

const initDb = require("./config/initDb");

const app = express();

/* -------------------------
   Middlewares (LOCAL)
-------------------------- */
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

/* -------------------------
   IMPORTANT: Static Folder (FIX)
-------------------------- */
// 🔥 This allows accessing uploaded files
app.use("/uploads", express.static("uploads"));

/* -------------------------
   Debug ENV
-------------------------- */
const logger = require("./utils/logger");
const pinoHttp = require('pino-http')({ logger });

app.use(pinoHttp);

if (!process.env.GEMINI_API_KEY) {
  logger.warn("⚠️ GEMINI_API_KEY is MISSING in .env");
} else {
  logger.info("✅ GEMINI_API_KEY Loaded");
}

/* -------------------------
   Routes
-------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/analyze", analysisRoutes);
app.use("/api/jd", jdRoutes);
app.use("/api/resume", resumeRoutes);   // ✅ IMPORTANT
app.use("/api/full-analysis", fullAnalysisRoutes);
app.use("/api/user", userRoutes);

/* -------------------------
   Health Check
-------------------------- */
app.get("/", (req, res) => {
  res.send("🚀 AI Resume Analyzer API Running (LOCAL)");
});

/* -------------------------
   404 Handler (VERY IMPORTANT)
-------------------------- */
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.originalUrl}`
  });
});

/* -------------------------
   Error Handler
-------------------------- */
app.use((err, req, res, next) => {
  logger.error(err, "❌ Error");

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* -------------------------
   Start Server
-------------------------- */
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    await initDb();
    logger.info(`🔥 Server running at http://localhost:${PORT}`);
  });
} else {
  // Initialize DB async for serverless
  initDb().catch(err => logger.error("DB Init Error:", err));
}

module.exports = app;