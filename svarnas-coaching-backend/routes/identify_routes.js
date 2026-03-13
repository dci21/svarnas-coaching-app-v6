const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// the full id that are only visible to the user
const MY_COLUMNS = [
  'private_first_name', 'private_last_name',
  'how_we_call_you', 'public_name',
  'level', 'goal_distance', 'race_date',
  'runs_per_week', 'availability', 'long_run_day'
];

//the data that a coach can view excluding private or public fields
const COACHES_COLUMNS = MY_COLUMNS.filter(c =>
  c !== 'private_first_name' && c !== 'private_last_name' && c !== 'public_name'
);

router.get('/api/identity/myId', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${MY_COLUMNS.join(', ')}
       FROM profiles WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'cant find user' });
    }

    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'fetch error 500 - identify' });
  }
});

router.get('/api/identity/coach/:athleteId', authMiddleware, async (req, res) => {
  const athleteId = parseInt(req.params.athleteId, 10);
  if (!Number.isInteger(athleteId)) {
    return res.status(400).json({ error: 'cant fild athlete' });
  }

  try {
    // coach can only view data from athletes that are linked to him
    const { rows } = await pool.query(
      `SELECT ${COACHES_COLUMNS.map(c => 'p.' + c).join(', ')}
       FROM coaching c
       JOIN profiles p ON p.user_id = c.athlete_id
       WHERE c.coach_id = $1 AND c.athlete_id = $2`,
      [req.user.user_id, athleteId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'you are not linked to this athlete' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - identify' });
  }
});

module.exports = router;
