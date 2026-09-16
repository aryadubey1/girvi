// Run manually to create a login account.
// Usage: node createUser.js <username> <password>

require('dotenv').config();
const bcrypt = require('bcrypt');
const { prodPool } = require('./db');

async function createUser(username, password) {
  if (!username || !password) {
    console.error('Usage: node createUser.js <username> <password>');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = await prodPool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, password_hash]
    );
    console.log('Created user:', result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      console.error(`Username "${username}" already exists.`);
    } else {
      console.error('Failed to create user:', err.message);
    }
  } finally {
    await prodPool.end();
  }
}

const [, , username, password] = process.argv;
createUser(username, password);