const logger = require('../utils/logger');
const { Pool } = require("pg");
const crypto = require("crypto");
const uuidv4 = crypto.randomUUID;

// Real Postgres Pool
const realPool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
      }
    : {
        user: process.env.DB_USER || "postgres",
        host: process.env.DB_HOST || "localhost",
        database: process.env.DB_NAME || "resume_analyzer",
        password: process.env.DB_PASSWORD || "postgres123",
        port: parseInt(process.env.DB_PORT || "5432"),
        connectionTimeoutMillis: 3000,
      }
);

let isPgConnected = false;

// Test initial Postgres connection asynchronously
(async () => {
  try {
    const client = await realPool.connect();
    client.release();
    isPgConnected = true;
    logger.info("✅ Connected to PostgreSQL Database.");
  } catch (err) {
    isPgConnected = false;
    logger.warn("⚠️ PostgreSQL connection failed (" + err.message + "). Using In-Memory Database Fallback.");
  }
})();

// In-Memory Storage Tables
const memoryDb = {
  users: [],
  resumes: [],
  job_descriptions: [],
  analysis_reports: [],
  password_reset_tokens: []
};

// Simple Parameterized SQL Parser & Executor for In-Memory Fallback
const executeInMemoryQuery = (text, params = []) => {
  const sql = text.trim();
  const lowerSql = sql.toLowerCase();

  // DDL / Extensions / Table creation
  if (lowerSql.startsWith("create")) {
    return { rows: [], rowCount: 0 };
  }

  // INSERT INTO users
  if (lowerSql.includes("insert into users")) {
    const newUser = {
      id: uuidv4(),
      email: params[0],
      password_hash: params[1],
      full_name: params[2] || "",
      created_at: new Date(),
      updated_at: new Date()
    };
    memoryDb.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // SELECT ... FROM users WHERE email = $1
  if (lowerSql.includes("from users") && lowerSql.includes("where email")) {
    const matched = memoryDb.users.filter(u => u.email === params[0]);
    return { rows: matched, rowCount: matched.length };
  }

  // SELECT ... FROM users WHERE id = $1
  if (lowerSql.includes("from users") && lowerSql.includes("where id")) {
    const matched = memoryDb.users.filter(u => u.id === params[0]);
    return { rows: matched, rowCount: matched.length };
  }

  // UPDATE users SET full_name = $1 ... WHERE id = $2
  if (lowerSql.includes("update users")) {
    const fullName = params[0];
    const userId = params[1];
    let updatedUser = null;
    memoryDb.users.forEach(u => {
      if (u.id === userId) {
        u.full_name = fullName;
        u.updated_at = new Date();
        updatedUser = u;
      }
    });
    return { rows: updatedUser ? [updatedUser] : [], rowCount: updatedUser ? 1 : 0 };
  }

  // UPDATE resumes SET is_latest = FALSE WHERE user_id = $1
  if (lowerSql.includes("update resumes set is_latest = false")) {
    const userId = params[0];
    memoryDb.resumes.forEach(r => {
      if (r.user_id === userId) r.is_latest = false;
    });
    return { rows: [], rowCount: 0 };
  }

  // UPDATE resumes SET is_latest = TRUE WHERE id = $1
  if (lowerSql.includes("update resumes set is_latest = true")) {
    const resumeId = params[0];
    memoryDb.resumes.forEach(r => {
      if (r.id === resumeId) r.is_latest = true;
    });
    return { rows: [], rowCount: 0 };
  }

  // UPDATE resumes SET structured_data = $1 WHERE id = $2
  if (lowerSql.includes("update resumes set structured_data")) {
    const structData = params[0];
    const resumeId = params[1];
    memoryDb.resumes.forEach(r => {
      if (r.id === resumeId) r.structured_data = structData;
    });
    return { rows: [], rowCount: 0 };
  }

  // INSERT INTO resumes
  if (lowerSql.includes("insert into resumes")) {
    const newResume = {
      id: uuidv4(),
      user_id: params[0],
      file_name: params[1],
      file_type: params[2] || (params[3] && params[3].includes("pdf") ? "pdf" : "docx"),
      parsed_content: params[3] || params[4] || "",
      s3_key: params[4] || params[2] || "local-storage",
      structured_data: params[5] || "{}",
      embedding: params[6] || null,
      is_latest: true,
      file_url: params[4] && params[4].startsWith("http") ? params[4] : null,
      created_at: new Date()
    };
    memoryDb.resumes.push(newResume);
    return { rows: [newResume], rowCount: 1 };
  }

  // SELECT ... FROM resumes WHERE id = $1 AND user_id = $2
  if (lowerSql.includes("from resumes") && lowerSql.includes("where id = $1")) {
    const matched = memoryDb.resumes.filter(r => r.id === params[0] && (!params[1] || r.user_id === params[1]));
    return { rows: matched, rowCount: matched.length };
  }

  // SELECT ... FROM resumes WHERE user_id = $1
  if (lowerSql.includes("from resumes") && lowerSql.includes("user_id = $1")) {
    const matched = memoryDb.resumes
      .filter(r => r.user_id === params[0])
      .sort((a, b) => b.created_at - a.created_at);
    return { rows: matched, rowCount: matched.length };
  }

  // DELETE FROM resumes WHERE id = $1
  if (lowerSql.includes("delete from resumes")) {
    const resumeId = params[0];
    const idx = memoryDb.resumes.findIndex(r => r.id === resumeId);
    if (idx !== -1) memoryDb.resumes.splice(idx, 1);
    return { rows: [], rowCount: 1 };
  }

  // INSERT INTO job_descriptions
  if (lowerSql.includes("insert into job_descriptions")) {
    const newJd = {
      id: uuidv4(),
      user_id: params[0],
      title: params[1],
      company: params[2],
      raw_text: params[3],
      embedding: params[4] || null,
      created_at: new Date()
    };
    memoryDb.job_descriptions.push(newJd);
    return { rows: [newJd], rowCount: 1 };
  }

  // SELECT ... FROM job_descriptions WHERE user_id = $1
  if (lowerSql.includes("from job_descriptions")) {
    const matched = memoryDb.job_descriptions
      .filter(j => j.user_id === params[0])
      .sort((a, b) => b.created_at - a.created_at);
    return { rows: matched, rowCount: matched.length };
  }

  // INSERT INTO analysis_reports
  if (lowerSql.includes("insert into analysis_reports")) {
    const safeParse = (v) => {
      if (typeof v !== "string") return v || [];
      try { return JSON.parse(v); } catch { return []; }
    };

    let newReport;
    if (params.length >= 8) {
      // fullAnalysisRoutes style: [resume_id, jd_id, status, score, summary, missing_skills, weaknesses, improvement_plan]
      newReport = {
        id: uuidv4(),
        resume_id: params[0],
        jd_id: params[1],
        processing_status: params[2] || "completed",
        overall_match_score: typeof params[3] === "number" ? params[3] : 75,
        alignment_summary: params[4] || "",
        missing_skills: safeParse(params[5]),
        weaknesses: safeParse(params[6]),
        improvement_plan: safeParse(params[7]),
        created_at: new Date(),
        completed_at: new Date()
      };
    } else {
      // resumeController style: [reportId, finalScore, missingSkills, weaknesses, suggestions, status]
      newReport = {
        id: params[0] || uuidv4(),
        resume_id: null,
        jd_id: null,
        overall_match_score: typeof params[1] === "number" ? params[1] : 75,
        missing_skills: safeParse(params[2]),
        weaknesses: safeParse(params[3]),
        improvement_plan: safeParse(params[4]),
        processing_status: params[5] || "completed",
        alignment_summary: "",
        created_at: new Date(),
        completed_at: new Date()
      };
    }
    memoryDb.analysis_reports.push(newReport);
    return { rows: [newReport], rowCount: 1 };
  }

  // SELECT ... FROM analysis_reports
  if (lowerSql.includes("from analysis_reports")) {
    const userId = params[0];
    const results = memoryDb.analysis_reports.map(ar => {
      const jd = memoryDb.job_descriptions.find(j => j.id === ar.jd_id) || {};
      const res = memoryDb.resumes.find(r => r.id === ar.resume_id) || {};
      return {
        id: ar.id,
        overall_match_score: ar.overall_match_score,
        alignment_summary: ar.alignment_summary,
        missing_skills: ar.missing_skills,
        weaknesses: ar.weaknesses,
        improvement_plan: ar.improvement_plan,
        processing_status: ar.processing_status,
        created_at: ar.created_at,
        completed_at: ar.completed_at,
        title: jd.title || "Software Engineer",
        company: jd.company || "Tech Company",
        file_name: res.file_name || "Resume.pdf"
      };
    });
    return { rows: results, rowCount: results.length };
  }

  // Password reset tokens queries
  if (lowerSql.includes("password_reset_tokens")) {
    if (lowerSql.includes("delete from")) return { rows: [], rowCount: 0 };
    if (lowerSql.includes("insert into")) {
      memoryDb.password_reset_tokens.push({ user_id: params[0], token: params[1], expires_at: params[2], used: false });
      return { rows: [], rowCount: 1 };
    }
    if (lowerSql.includes("select")) {
      const validToken = memoryDb.password_reset_tokens.find(t => t.token === params[0] && !t.used);
      return { rows: validToken ? [validToken] : [], rowCount: validToken ? 1 : 0 };
    }
  }

  return { rows: [], rowCount: 0 };
};

// Unified Pool Object
const pool = {
  query: async (text, params) => {
    if (isPgConnected) {
      try {
        return await realPool.query(text, params);
      } catch (err) {
        logger.warn("⚠️ Postgres query error, falling back to in-memory mode:", err.message);
        isPgConnected = false;
        return executeInMemoryQuery(text, params);
      }
    }
    return executeInMemoryQuery(text, params);
  },
  connect: async () => {
    if (isPgConnected) return realPool.connect();
    return {
      query: async (text, params) => executeInMemoryQuery(text, params),
      release: () => {}
    };
  }
};

module.exports = pool;
