const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'no token for authorization' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    // return always 401 not exposing the reason to not let attackers know more and probe the signin setup
    if (err.name === 'TokenExpiredError') {
      console.error('expired token from %s', req.ip);
    }
    return res.status(401).json({ error: 'token expired' });
  }
}

module.exports = authMiddleware;
