require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const jdRoutes = require("./routes/jdRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const fullAnalysisRoutes = require("./routes/fullAnalysisRoutes");
const userRoutes = require("./routes/userRoutes");
const forgotPasswordRoutes = require("./routes/forgotPasswordRoutes");

const app = express();

/* -------------------------
   Middlewares
-------------------------- */
app.use(cors());
app.use(express.json());

/* -------------------------
   Verify Gemini API Key
-------------------------- */
console.log(
  "GEMINI API KEY:",
  process.env.GEMINI_API_KEY ? "Loaded" : "Missing"
);

/* -------------------------
   Routes
-------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/auth", forgotPasswordRoutes);
app.use("/api/analyze", analysisRoutes);
app.use("/api/jd", jdRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/full-analysis", fullAnalysisRoutes);
app.use("/api/user", userRoutes);

/* -------------------------
   Health Check
-------------------------- */
app.get("/", (req, res) => {
  res.send("AI Resume Analyzer API Running");
});

/* -------------------------
   Start Server
-------------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});