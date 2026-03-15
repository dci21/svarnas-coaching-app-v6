require('dotenv').config();
const express = require('express');
const pool = require('./db');
const authRoutes = require('./routes/auth_routes');
const profileRoutes = require('./routes/profile_routes');
const identifyRoutes = require('./routes/identify_routes');
const coachRoutes = require('./routes/coach_routes');
const trainingPlanRoutes = require('./routes/training_plan_routes');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/api/ping', async (req, res) => {
  const t0 = Date.now();
  try {
    const result = await pool.query('SELECT now()');
    res.json({
      db: 'connected',
      timestamp: result.rows[0].now,
      latency: Date.now() - t0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ db: 'connection failed' });
  }
});

app.use(authRoutes);
app.use(profileRoutes);
app.use(identifyRoutes);
app.use(coachRoutes);
app.use(trainingPlanRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal error' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`listening on port ${port}`);
  });
}

module.exports = app;
