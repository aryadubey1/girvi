// Run manually to reset an existing user's password from the terminal.
// Usage: node resetPassword.js <username> <newPassword>

require('dotenv').config();
const bcrypt = require('bcrypt');
const { prodPool } = require('./db');

async function resetPassword(username, newPassword) {
  if (!username || !newPassword) {
    console.error('Usage: node resetPassword.js <username> <newPassword>');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(newPassword, 10);

  try {
    const result = await prodPool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
      [password_hash, username]
    );

    if (result.rows.length === 0) {
      console.error(`No user found with username "${username}".`);
    } else {
      console.log('Password updated for:', result.rows[0]);
    }
  } catch (err) {
    console.error('Failed to reset password:', err.message);
  } finally {
    await prodPool.end();
  }
}

const [, , username, newPassword] = process.argv;
resetPassword(username, newPassword);
