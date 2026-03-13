// svarnas-coaching-backend/auth_middleware.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    // not authenticated client
    return res.status(401).json({ error: 'missing token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    // internal log for the error
    console.warn('bad token from', req.ip);
    // send generic unathorised error to the client
    return res.status(401).json({ error: 'unauthorised' });
  }
}

module.exports = authMiddleware;
