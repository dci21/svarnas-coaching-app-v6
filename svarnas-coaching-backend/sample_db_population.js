require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const SEED_PASS = 'sample1234';

// add sample data to db to test the app
const demoUsers = [
  {
    email: 'sample@athlete.com',
    role: 'athlete',
    profile: {
      private_first_name: 'AthleteFirstName',
      private_last_name: 'AthleteLastName',
      how_we_call_you: 'AthletePrefferedName',
      public_name: 'AthletePublicName',
      level: 'intermediate',
      goal_distance: 'marathon',
      race_date: '2026-04-12',      
      availability: ['mon', 'wed', 'fri', 'sat'],
      long_run_day: 'sat',
      runs_per_week: 4
    }
  },
  {
    email: 'sample@coach.com',
    role: 'coach',
    profile: {
      private_first_name: 'CoachFirstName',
      private_last_name: 'CoachLastName',
      how_we_call_you: 'CoachPrefferedName',
      public_name: 'CoachPublicName'
    }
  },
  {
    email: 'sample@admin.com',
    role: 'admin',
    profile: {
      private_first_name: 'AdminFirstName',
      private_last_name: 'AdminLastName',
      how_we_call_you: 'AdminPrefferedName',
      public_name: 'AdminPublicName'
    }
  }
];


async function seed() {
  const hashed = await bcrypt.hash(SEED_PASS, 10);
  const createdIds = {};

  for (const u of demoUsers) {
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1', [u.email]
    );

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].user_id;
      await pool.query('UPDATE users SET role = $1 WHERE user_id = $2', [u.role, userId]);
      console.log('  updated existing user: ' + u.email + ' (' + u.role + ')');
    } else {
      const ins = await pool.query(
        'INSERT INTO users (email, hashed_pass, role) VALUES ($1, $2, $3) RETURNING user_id',
        [u.email, hashed, u.role]
      );
      userId = ins.rows[0].user_id;
      console.log('  created user: ' + u.email + ' (' + u.role + ')');
    }

    createdIds[u.role] = userId;

    const profileExists = await pool.query(
      'SELECT profile_id FROM profiles WHERE user_id = $1', [userId]
    );
    if (profileExists.rows.length === 0) {
      await pool.query('INSERT INTO profiles (user_id) VALUES ($1)', [userId]);
    }

    if (u.profile) {
      const fields = { ...u.profile };
      if (fields.availability) {
        fields.availability = JSON.stringify(fields.availability);
      }

      const keys = Object.keys(fields);
      const setClauses = keys.map((k, i) => {
        if (k === 'availability') return k + ' = ($' + (i + 2) + ')::jsonb';
        return k + ' = $' + (i + 2);
      });
      const vals = keys.map(k => fields[k]);

      await pool.query(
        'UPDATE profiles SET ' + setClauses.join(', ') + ' WHERE user_id = $1',
        [userId, ...vals]
      );
    }
  }

  if (createdIds.athlete && createdIds.coach) {
    const linkExists = await pool.query(
      'SELECT linking_id FROM coaching WHERE athlete_id = $1', [createdIds.athlete]
    );
    if (linkExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO coaching (coach_id, athlete_id) VALUES ($1, $2)',
        [createdIds.coach, createdIds.athlete]
      );
      console.log('  linked athlete to coach');
    } else {
      await pool.query(
        'UPDATE coaching SET coach_id = $1 WHERE athlete_id = $2',
        [createdIds.coach, createdIds.athlete]
      );
      console.log('  updated athlete-coach link');
    }
  }

  console.log('\ndone. demo accounts:');
  console.log(' username: sample@athlete.com / password: ' + SEED_PASS);
  console.log(' username: sample@coach.com   / password: ' + SEED_PASS);
  console.log(' username: sample@admin.com   / password: ' + SEED_PASS);
}

seed()
  .then(() => pool.end())
  .catch(err => {
    console.error('seed failed:', err.message);
    pool.end();
    process.exit(1);
  });
