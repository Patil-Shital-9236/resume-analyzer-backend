const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    const { email, password, full_name, guestResumeId } = req.body;

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1,$2,$3)
       RETURNING id,email,full_name`,
      [email, hashedPassword, full_name]
    );

    const userId = result.rows[0].id;

    if (guestResumeId && guestResumeId !== "null" && guestResumeId !== "undefined") {
      await pool.query(`UPDATE resumes SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, [userId, guestResumeId]);
      await pool.query(`UPDATE job_descriptions SET user_id = $1 WHERE id IN (SELECT jd_id FROM analysis_reports WHERE resume_id = $2) AND user_id IS NULL`, [userId, guestResumeId]);
    }

    res.json({
      message: "User registered successfully",
      user: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// LOGIN USER
exports.loginUser = async (req, res) => {
  try {

    const { email, password, guestResumeId } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (guestResumeId && guestResumeId !== "null" && guestResumeId !== "undefined") {
      await pool.query(`UPDATE resumes SET user_id = $1 WHERE id = $2 AND user_id IS NULL`, [user.id, guestResumeId]);
      await pool.query(`UPDATE job_descriptions SET user_id = $1 WHERE id IN (SELECT jd_id FROM analysis_reports WHERE resume_id = $2) AND user_id IS NULL`, [user.id, guestResumeId]);
    }

    const token = jwt.sign(
      { id: user.id },
      "secret_key",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      userId: user.id,
      full_name: user.full_name
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};