const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../config/db");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// ── POST /api/auth/forgot-password ──
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const userResult = await pool.query("SELECT id, full_name FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.json({ message: "If this email exists, a reset link has been sent." });
    }

    const user = userResult.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [user.id]);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"AI Resume Analyzer" <${process.env.BREVO_SMTP_USER}>`,
      to: email,
      subject: "Reset Your Password — AI Resume Analyzer",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:28px 32px;">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">AI Resume Analyzer</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Smart Career Insights</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#111827;font-size:18px;margin:0 0 10px;">Reset Your Password</h2>
            <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi <strong>${user.full_name}</strong>, we received a request to reset your password.
              Click the button below to create a new password.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Reset Password
            </a>
            <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.6;">
              This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
            </p>
            <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;">
              <p style="color:#d1d5db;font-size:11px;margin:0;">© 2025 AI Resume Analyzer. All rights reserved.</p>
            </div>
          </div>
        </div>
      `,
    });

    res.json({ message: "If this email exists, a reset link has been sent." });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── POST /api/auth/reset-password ──
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const tokenResult = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()",
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
    }

    const resetToken = tokenResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashedPassword, resetToken.user_id]);
    await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [resetToken.id]);

    res.json({ message: "Password reset successfully. You can now log in." });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── GET /api/auth/verify-reset-token ──
router.get("/verify-reset-token", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false });

  try {
    const result = await pool.query(
      "SELECT id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()",
      [token]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;