const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth_middleware');
const { generateTrainingPlan } = require('../helpers/trainingPlanGenerator');

const router = express.Router();

router.post('/api/training-plans/generate', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT level, goal_distance, race_date, availability, long_run_day, runs_per_week
       FROM profiles WHERE user_id = $1`,
      [req.user.user_id]
    );

    const profile = rows[0];

    if (!profile || !profile.level || !profile.goal_distance ||
        !profile.race_date || !profile.availability || !profile.long_run_day) {
      return res.status(400).json({
        error: 'you cant generate a training plan without providing data. Fill your profile page'
      });
    }

    const result = generateTrainingPlan(profile);

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const saved = await pool.query(
      `INSERT INTO generated_training_plans (athlete_id, training_plan, generation_metadata)
       VALUES ($1, $2::jsonb, $3::jsonb) RETURNING plan_id, created`,
      [req.user.user_id, JSON.stringify(result.training_plan), JSON.stringify(result.generation_metadata)]
    );

    res.status(201).json({
      plan_id: saved.rows[0].plan_id,
      training_plan: result.training_plan,
      generation_metadata: result.generation_metadata,
      created: saved.rows[0].created
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error occured when generating the training plan' });
  }
});

router.get('/api/training-plans', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT plan_id, generation_metadata, created
       FROM generated_training_plans
       WHERE athlete_id = $1
       ORDER BY created DESC`,
      [req.user.user_id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - training plans' });
  }
});

router.get('/api/training-plans/:trainingPlanId', authMiddleware, async (req, res) => {
  const trainingPlanId = parseInt(req.params.trainingPlanId, 10);
  if (!Number.isInteger(trainingPlanId)) {
    return res.status(400).json({ error: 'no training plan found with this id' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT plan_id, training_plan, generation_metadata, created
       FROM generated_training_plans
       WHERE plan_id = $1 AND athlete_id = $2`,
      [trainingPlanId, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'no training plan found with this id' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'fetch error 500 - training plans' });
  }
});

module.exports = router;
