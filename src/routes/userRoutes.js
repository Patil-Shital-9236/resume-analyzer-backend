const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// GET /api/user/profile/:userId
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/profile/:userId
router.put("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name } = req.body;
    const result = await pool.query(
      `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, created_at`,
      [full_name, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/resumes/:userId
router.get("/resumes/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, file_name, file_type, file_url, is_latest, created_at FROM resumes WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ resumes: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/resumes/:resumeId/set-latest
router.put("/resumes/:resumeId/set-latest", async (req, res) => {
  try {
    const { resumeId } = req.params;
    const { userId } = req.body;
    await pool.query(`UPDATE resumes SET is_latest = FALSE WHERE user_id = $1`, [userId]);
    await pool.query(`UPDATE resumes SET is_latest = TRUE WHERE id = $1`, [resumeId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/user/resumes/:resumeId
router.delete("/resumes/:resumeId", async (req, res) => {
  try {
    const { resumeId } = req.params;
    await pool.query(`DELETE FROM resumes WHERE id = $1`, [resumeId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/history/:userId
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT 
        ar.id, ar.overall_match_score, ar.alignment_summary,
        ar.missing_skills, ar.weaknesses, ar.improvement_plan,
        ar.processing_status, ar.created_at, ar.completed_at,
        jd.title, jd.company,
        r.file_name
       FROM analysis_reports ar
       JOIN job_descriptions jd ON ar.jd_id = jd.id
       JOIN resumes r ON ar.resume_id = r.id
       WHERE jd.user_id = $1
       ORDER BY ar.created_at DESC`,
      [userId]
    );
    res.json({ history: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/job-descriptions/:userId
router.get("/job-descriptions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT id, title, company, created_at FROM job_descriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ jobDescriptions: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;