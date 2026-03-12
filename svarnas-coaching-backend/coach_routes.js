const express = require('express');
const pool = require('./db');
const authMiddleware = require('./auth_middleware');

const router = express.Router();

// show only users with the coach role
router.get('/api/coach/list-coaches', authMiddleware, async (req, res) => {
  try {
    const availableCoaches = await pool.query(
      `SELECT u.user_id, u.email, p.how_we_call_you
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.user_id
       WHERE u.role = 'coach'
       ORDER BY p.how_we_call_you NULLS LAST`
    );

    res.json(availableCoaches.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - coach' });
  }
});

router.put('/api/coach/set-coach', authMiddleware, async (req, res) => {
  const coachID = parseInt(req.body.coach_id, 10);
  if (!Number.isInteger(coachID)) {
    return res.status(400).json({ error: 'coach id cant be empty' });
  }

  if (coachID === req.user.user_id) {
    return res.status(400).json({ error: 'self coaching not allowed' });
  }

  try {
    const coachExists = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1 AND role = $2',
      [coachID, 'coach']
    );
    if (coachExists.rows.length === 0) {
      return res.status(404).json({ error: 'no coach with this id' });
    }

    // only one coach per athlete is allowed - if another coach is linked then replace
    await pool.query('DELETE FROM coaching WHERE athlete_id = $1', [req.user.user_id]);
    const inserted = await pool.query(
      'INSERT INTO coaching (coach_id, athlete_id) VALUES ($1, $2) RETURNING linking_id',
      [coachID, req.user.user_id]
    );
    res.json({ linked: true, coach_id: coachID, linking_id: inserted.rows[0].linking_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'linking error 500' });
  }
});

router.get('/api/coach/linked-coach', authMiddleware, async (req, res) => {
  try {
    const linkedCoach = await pool.query(
      `SELECT u.user_id, u.email, p.how_we_call_you
       FROM coaching c
       JOIN users u ON u.user_id = c.coach_id
       LEFT JOIN profiles p ON p.user_id = c.coach_id
       WHERE c.athlete_id = $1`,
      [req.user.user_id]
    );

    if (linkedCoach.rows.length === 0) {
      return res.json({ coach: null });
    }

    res.json({ coach: linkedCoach.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - coach' });
  }
});

router.delete('/api/coach/remove-coach', authMiddleware, async (req, res) => {
  try {
    const removed = await pool.query(
      'DELETE FROM coaching WHERE athlete_id = $1',
      [req.user.user_id]
    );

    if (removed.rowCount === 0) {
      return res.status(404).json({ error: 'no coach is linked to your account' });
    }

    res.json({ removed: true });
  } catch {
    res.status(500).json({ error: 'remove error 500' });
  }
});

router.get('/api/coach/linked-athletes', authMiddleware, async (req, res) => {
  if (req.user.role !== 'coach') {
    return res.status(403).json({ error: 'athletes can be viewed only by coaches who are linked with' });
  }

  try {
    const { rows: athletes } = await pool.query(
      `SELECT c.athlete_id, p.how_we_call_you, p.level, p.goal_distance,
              p.race_date, p.runs_per_week, p.availability, p.long_run_day
       FROM coaching c
       JOIN profiles p ON p.user_id = c.athlete_id
       WHERE c.coach_id = $1`,
      [req.user.user_id]
    );

    res.json(athletes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - coach' });
  }
});

module.exports = router;
