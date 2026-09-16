const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { prodPool } = require('./db');
const requireAuth = require('./requireAuth');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await prodPool.query(
      'SELECT id, username, password_hash, db_target FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Incorrect username or password' });
    }

    req.session.authenticated = true;
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.dbTarget = user.db_target;

    return res.json({ success: true, username: user.username, dbTarget: user.db_target });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/check-auth', (req, res) => {
  const authenticated = !!(req.session && req.session.authenticated);
  res.json({
    authenticated,
    username: authenticated ? req.session.username : null,
    dbTarget: authenticated ? req.session.dbTarget : null,
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Users table always lives in the prod DB, regardless of which DB
    // this user's session queries for customer/loan data.
    const result = await prodPool.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prodPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;