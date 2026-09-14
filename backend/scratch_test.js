require('dotenv').config();
const pool = require('./db.js');

async function test() {
  const result = await pool.query('SELECT * FROM payments LIMIT 5');
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

test();
