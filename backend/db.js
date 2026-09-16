require('dotenv').config();
const { Pool, types } = require('pg');

types.setTypeParser(1082, (val) => val);

const prodPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const sandboxPool = new Pool({
  user: process.env.SANDBOX_DB_USER || process.env.DB_USER,
  password: process.env.SANDBOX_DB_PASSWORD || process.env.DB_PASSWORD,
  host: process.env.SANDBOX_DB_HOST || process.env.DB_HOST,
  port: process.env.SANDBOX_DB_PORT || process.env.DB_PORT,
  database: process.env.SANDBOX_DB_NAME,
});

module.exports = {
  prodPool,
  sandboxPool,
  getPool: (target) => (target === 'sandbox' ? sandboxPool : prodPool),
};