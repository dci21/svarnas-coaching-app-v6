const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const authMiddleware = require('./auth_middleware');
const rateLimiter = require('./rate_limiter');

const router = express.Router();
const authlimiter = rateLimiter(15 * 60 * 1000, 30);
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

router.post('/api/signup', authlimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const { pass } = req.body;
  if (!email || !pass || !/@.+\./.test(email)) {
    return res.status(400).json({ error: 'email and pass required' });
  }

  try {
    const emailExisting = await pool.query(
      'SELECT user_id FROM users WHERE email = $1', [email]
    );
    if (emailExisting.rows.length > 0) {
      return res.status(409).json({ error: 'email exists' });
    }

    const hashedPass = await bcrypt.hash(pass, BCRYPT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (email, hashed_pass) VALUES ($1, $2) RETURNING user_id',
      [email, hashedPass]
    );

    await pool.query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [result.rows[0].user_id]
    );

    res.status(201).json({ registered: 'succeed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'signup failed' });
  }
});

router.post('/api/signin', authlimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const { pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ error: 'email and pass required' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, email, hashed_pass, role FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'invalid mail or password' });
    }

    const user = result.rows[0];
    const validToken = await bcrypt.compare(pass, user.hashed_pass);
    if (!validToken) {
      return res.status(401).json({ error: 'invalid mail or password' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ jwt_token: token });
  } catch {
    res.status(500).json({ error: 'signin failed' });
  }
});

router.get('/api/auth/session', authMiddleware, async (req, res) => {
  const result = await pool.query(
    `SELECT u.user_id, u.email, u.role, p.how_we_call_you
     FROM users u
     LEFT JOIN profiles p ON u.user_id = p.user_id
     WHERE u.user_id = $1`,
    [req.user.user_id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'cant find user' });
  }

  const row = result.rows[0];
  res.json({
    user_id: row.user_id,
    email: row.email,
    role: row.role,
    how_we_call_you: row.how_we_call_you
  });
});

module.exports = router;
