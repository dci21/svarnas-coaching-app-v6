const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth_middleware');

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
    const { rows } = await pool.query(
      `SELECT ${PROFILE_COLUMNS.join(', ')}
       FROM profiles WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'cant find user' });
    }

    res.json(rows[0]);
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

  // runs_per_week is derived from availability - dont trust client value
  delete holdingFields.runs_per_week;

  if (holdingFields.availability !== undefined) {
    const avaliability = holdingFields.availability;

    if (Array.isArray(avaliability) && avaliability.length === 0) {
      return res.status(400).json({
        error: 'At least one day must be selected'
      });
    }

    if (!Array.isArray(avaliability) || !avaliability.every(d => validEnum.days.has(d))) {
      return res.status(400).json({
        error: 'invalid days in the avaliability. Days should be an array as ["mon", "tue", "wed", ... "sun"]'
      });
    }

    // workouts count comes from how many days the user picked
    const countAvailableDaysForTraining = avaliability.length;
    holdingFields.runs_per_week = countAvailableDaysForTraining;
  }

  if (holdingFields.long_run_day !== undefined && holdingFields.availability !== undefined) {
    if (!holdingFields.availability.includes(holdingFields.long_run_day)) {
      return res.status(400).json({
        error: 'Longrun day can not be outside of the Available Days for Training'
      });
    }
  }

  // set clauses to avoid overwritting fields with null
  const setCols = Object.keys(holdingFields);
  const values = [];
  const setParts = [];

  // serialise js arrays as pg arrays - stringfiy and cast to meet the jsonb column accurately
  for (let n = 0; n < setCols.length; n++) {
    const col = setCols[n];
    if (col === 'availability') {
      setParts.push(col + ' = $' + (n + 1) + '::jsonb');
      values.push(JSON.stringify(holdingFields[col]));
    } else {
      setParts.push(col + ' = $' + (n + 1));
      values.push(holdingFields[col]);
    }
  }

  values.push(req.user.user_id);

  try {
    const result = await pool.query(
      `UPDATE profiles SET ${setParts.join(', ')}
       WHERE user_id = $${setCols.length + 1}
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
