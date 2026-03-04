require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/ping', async (req, res) => {
  const t0 = Date.now();
  try {
    await pool.query('SELECT 1');
    res.json({
      db: 'connected',
      timestamp: new Date().toISOString(),
      latency: Date.now() - t0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ db: 'connection failed' });
  }
});

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
