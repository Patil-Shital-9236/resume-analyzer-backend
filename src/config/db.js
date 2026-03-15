
// const { Pool } = require("pg");

// const pool = new Pool(
//   process.env.DATABASE_URL
//     ? {
//         connectionString: process.env.DATABASE_URL,
//         ssl: { rejectUnauthorized: false },
//       }
//     : {
//         user: "postgres",
//         host: "localhost",
//         database: "resume_analyzer",
//         password: "postgres123",
//         port: 5432,
//       }
// );

// module.exports = pool;


const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: "resume_analyzer_db_v8o3_user",
        host: "dpg-d6qjkbn5gffc73er1l5g-a.oregon-postgres.render.com",
        database: "resume_analyzer_db_v8o3",
        password: "g6rh10AsuPD4dYfw2ZRjFNFPWmiOSLlh",
        port: 5432,
      }
);

module.exports = pool;
