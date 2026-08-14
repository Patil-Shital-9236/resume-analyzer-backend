const logger = require('../utils/logger');
const pool = require("./db");

const initDb = async () => {
  try {
    logger.info("🔄 Initializing database tables...");

    await pool.query(`

      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS resumes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        s3_key VARCHAR(255) DEFAULT 'local-storage',
        file_type VARCHAR(50),
        parsed_content TEXT,
        structured_data JSONB DEFAULT '{}'::jsonb,
        embedding TEXT,
        is_latest BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS job_descriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        company VARCHAR(255),
        raw_text TEXT,
        embedding TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS analysis_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
        jd_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
        processing_status VARCHAR(50) DEFAULT 'completed',
        overall_match_score INT,
        alignment_summary TEXT,
        missing_skills JSONB DEFAULT '[]'::jsonb,
        weaknesses JSONB DEFAULT '[]'::jsonb,
        improvement_plan JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    logger.info("✅ Database tables initialized successfully.");
  } catch (err) {
    logger.error("⚠️ Database initialization error:", err.message);
  }
};

module.exports = initDb;
