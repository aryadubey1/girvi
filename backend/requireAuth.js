const { getPool } = require('./db');

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    req.db = getPool(req.session.dbTarget);
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

module.exports = requireAuth;