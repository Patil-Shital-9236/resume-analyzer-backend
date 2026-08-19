const db = require('./src/config/db');
(async () => {
  try {
    const res = await db.query('INSERT INTO resumes (user_id, file_name, file_type, parsed_content, file_url, is_latest) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id', ['null', 'test.pdf', 'pdf', 'hello', 'processing']);
    console.log('Success:', res.rows);
  } catch(e) {
    console.error('Error:', e);
  }
})();
