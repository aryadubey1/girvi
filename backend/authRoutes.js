const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === process.env.APP_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Incorrect password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/check-auth', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

module.exports = router;