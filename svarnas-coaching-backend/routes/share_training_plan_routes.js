const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const authMiddleware = require('../middleware/auth_middleware');

const router = express.Router();

// if exists return the existing
router.post('/api/share/create-link', authMiddleware, async (req, res) => {
  const planId = parseInt(req.body.plan_id, 10);
  if (!Number.isInteger(planId)) {
    return res.status(400).json({ error: 'cant find the training plan for sharing' });
  }

  try {
    const generated_training_plan_id = await pool.query(
      'SELECT plan_id FROM generated_training_plans WHERE plan_id = $1 AND athlete_id = $2',
      [planId, req.user.user_id]
    );

    if (generated_training_plan_id.rows.length === 0) {
      return res.status(404).json({ error: 'cant find the training plan for sharing' });
    }

    const existing = await pool.query(
      'SELECT share_id, link FROM shared_plans WHERE plan_id = $1 AND is_active = true',
      [planId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        share_id: existing.rows[0].share_id,
        link: existing.rows[0].link,
        existing: true
      });
    }

    const generated_training_plan_slug = crypto.randomBytes(8).toString('hex');

    const result = await pool.query(
      'INSERT INTO shared_plans (plan_id, link) VALUES ($1, $2) RETURNING share_id, link, created',
      [planId, generated_training_plan_slug]
    );

    res.status(201).json({
      share_id: result.rows[0].share_id,
      link: result.rows[0].link,
      created: result.rows[0].created
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error sharing training plan' });
  }
});

router.delete('/api/share/:shareId', authMiddleware, async (req, res) => {
  const shareId = parseInt(req.params.shareId, 10);
  if (!Number.isInteger(shareId)) {
    return res.status(400).json({ error: 'no training plan with this id' });
  }

  try {
    const result = await pool.query(
      `UPDATE shared_plans SET is_active = false
       WHERE share_id = $1 AND plan_id IN (
         SELECT plan_id FROM generated_training_plans WHERE athlete_id = $2
       )
       RETURNING share_id`,
      [shareId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'no training plan with this id' });
    }

    res.json({ revoked: true, share_id: result.rows[0].share_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error sharing training plan' });
  }
});

router.get('/api/share/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const generated_training_plan_id = await pool.query(
      `SELECT sp.share_id, sp.is_active, sp.created as shared_on,
              gtp.training_plan, gtp.generation_metadata,
              p.public_name
       FROM shared_plans sp
       JOIN generated_training_plans gtp ON gtp.plan_id = sp.plan_id
       JOIN profiles p ON p.user_id = gtp.athlete_id
       WHERE sp.link = $1`,
      [slug]
    );

    if (generated_training_plan_id.rows.length === 0) {
      return res.status(404).json({ error: 'no such plan exists' });
    }

    const row = generated_training_plan_id.rows[0];

    if (!row.is_active) {
      return res.status(410).json({ error: 'training plan is not active' });
    }

    res.json({
      public_name: row.public_name,
      training_plan: row.training_plan,
      generation_metadata: row.generation_metadata,
      shared_on: row.shared_on
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'error sharing training plan' });
  }
});

module.exports = router;
