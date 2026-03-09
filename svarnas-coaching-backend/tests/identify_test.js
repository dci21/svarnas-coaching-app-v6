const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const athleteEmail = `idathlete_${Date.now()}@testlocal.dev`;
const coachEmail = `idcoach_${Date.now()}@testlocal.dev`;
const testPass = 'Qw77!abc';
let athleteToken = null;
let coachToken = null;
let athleteUserId = null;

beforeAll(async () => {
  await request(app)
    .post('/api/signup')
    .send({ email: athleteEmail, pass: testPass });

  await request(app)
    .post('/api/signup')
    .send({ email: coachEmail, pass: testPass });

  const athleteRes = await request(app)
    .post('/api/signin')
    .send({ email: athleteEmail, pass: testPass });
  athleteToken = athleteRes.body.jwt_token;

  const coachRes = await request(app)
    .post('/api/signin')
    .send({ email: coachEmail, pass: testPass });
  coachToken = coachRes.body.jwt_token;

  const athleteRow = await pool.query(
    'SELECT user_id FROM users WHERE email = $1', [athleteEmail]
  );
  athleteUserId = athleteRow.rows[0].user_id;

  const coachRow = await pool.query(
    'SELECT user_id FROM users WHERE email = $1', [coachEmail]
  );

  await pool.query(
    'UPDATE users SET role = $1 WHERE user_id = $2',
    ['coach', coachRow.rows[0].user_id]
  );

  await pool.query(
    'INSERT INTO coaching (coach_id, athlete_id) VALUES ($1, $2)',
    [coachRow.rows[0].user_id, athleteUserId]
  );

  await request(app)
    .put('/api/profile')
    .set('Authorization', 'Bearer ' + athleteToken)
    .send({
      private_first_name: 'Giorgos',
      private_last_name: 'Svarnas',
      how_we_call_you: 'Geo',
      public_name: 'G.S.',
      level: 'intermediate',
      goal_distance: 'marathon',
      availability: ['mon', 'wed', 'fri'],
      long_run_day: 'fri'
    });
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [athleteEmail, coachEmail]);
  await pool.end();
});

describe('GET /api/identity/myId', () => {
  it('the id is not shown to non auth users', async () => {
    const res = await request(app).get('/api/identity/myId');
    expect(res.status).toBe(401);
  });

  it('the user shows his full id', async () => {
    const res = await request(app)
      .get('/api/identity/myId')
      .set('Authorization', 'Bearer ' + athleteToken);

    expect(res.status).toBe(200);
    expect(res.body.private_first_name).toBe('Giorgos');
    expect(res.body.private_last_name).toBe('Svarnas');
    expect(res.body.how_we_call_you).toBe('Geo');
    expect(res.body.public_name).toBe('G.S.');
    expect(res.body.level).toBe('intermediate');
    expect(res.body.goal_distance).toBe('marathon');
  });
});

describe('GET /api/identity/coach/:athleteId', () => {
  it('coach is getting only the training related fields of a user that is linked', async () => {
    const res = await request(app)
      .get('/api/identity/coach/' + athleteUserId)
      .set('Authorization', 'Bearer ' + coachToken);

    expect(res.status).toBe(200);
    expect(res.body.how_we_call_you).toBe('Geo');
    expect(res.body.level).toBe('intermediate');
    expect(res.body.goal_distance).toBe('marathon');
    expect(res.body.availability).toEqual(['mon', 'wed', 'fri']);
  });

  it('coach view is never returning the private fields', async () => {
    const res = await request(app)
      .get('/api/identity/coach/' + athleteUserId)
      .set('Authorization', 'Bearer ' + coachToken);

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('private_first_name');
    expect(res.body).not.toHaveProperty('private_last_name');
    expect(res.body).not.toHaveProperty('public_name');
  });

  it('coach can not view an athlete that is not attached to', async () => {
    const res = await request(app)
      .get('/api/identity/coach/999999')
      .set('Authorization', 'Bearer ' + coachToken);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('you are not linked to this athlete');
  });
});
