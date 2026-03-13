const rateLimit = require('express-rate-limit');

function rateLimiter(windowMs, max) {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'too many requests - limit reached' }
  });
}

module.exports = rateLimiter;
