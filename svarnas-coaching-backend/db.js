const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 4000
});

pool.on('error', (err) => {
  console.error('idle pg client error', err.message);
});

process.on('SIGTERM', () => pool.end());

module.exports = pool;
