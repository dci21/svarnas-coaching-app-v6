const express = require('express');
const pool = require('./db');
const authMiddleware = require('./auth_middleware');

const router = express.Router();

const validEnum = {
  level: new Set(['novice', 'intermediate', 'advanced']),
  goal_distance: new Set(['5k', '10k', 'hm', 'marathon']),
  days: new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
};

// all columns available for PUT by users
const PROFILE_COLUMNS = [
  'private_first_name', 'private_last_name',
  'how_we_call_you', 'public_name',
  'level', 'goal_distance', 'race_date',
  'runs_per_week', 'availability', 'long_run_day'
];

router.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${PROFILE_COLUMNS.join(', ')}
       FROM profiles WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'cant find user' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'profile fetch error 500' });
  }
});

router.put('/api/profile', authMiddleware, async (req, res) => {
  // only allowed fields
  const holdingFields = {};
  for (const col of PROFILE_COLUMNS) {
    if (req.body[col] !== undefined) holdingFields[col] = req.body[col];
  }

  if (Object.keys(holdingFields).length === 0) {
    return res.status(400).json({ error: 'no changes send in the body' });
  }

  if (holdingFields.level !== undefined && !validEnum.level.has(holdingFields.level)) {
    return res.status(400).json({ error: 'invalid level enum' });
  }

  if (holdingFields.goal_distance !== undefined &&
      !validEnum.goal_distance.has(holdingFields.goal_distance)) {
    return res.status(400).json({ error: 'invalid goal_distance enum' });
  }

  if (holdingFields.runs_per_week !== undefined) {
    const runPerWeek = holdingFields.runs_per_week;
    if (!Number.isInteger(runPerWeek) || runPerWeek < 1 || runPerWeek > 7) {
      return res.status(400).json({
        error: 'invalid input. runs_per_week should be integer from 1 to 7'
      });
    }
  }

  if (holdingFields.availability !== undefined) {
    const avaliability = holdingFields.availability;
    if (!Array.isArray(avaliability) || !avaliability.every(d => validEnum.days.has(d))) {
      return res.status(400).json({
        error: 'invalid days in the avaliability. Days should be an array as ["mon", "tue", "wed", ... "sun"]'
      });
    }
  }

  const values = PROFILE_COLUMNS.map(c => {
    if (c === 'availability' && holdingFields[c] !== undefined) return JSON.stringify(holdingFields[c]);
    return holdingFields[c] !== undefined ? holdingFields[c] : null;
  });
  const setClause = PROFILE_COLUMNS.map((c, i) =>
    c === 'availability' ? `${c} = $${i + 1}::jsonb` : `${c} = $${i + 1}`
  ).join(', ');

  values.push(req.user.user_id);

  try {
    const result = await pool.query(
      `UPDATE profiles SET ${setClause}
       WHERE user_id = $${PROFILE_COLUMNS.length + 1}
       RETURNING ${PROFILE_COLUMNS.join(', ')}`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'profile update error 500' });
  }
});

module.exports = router;
