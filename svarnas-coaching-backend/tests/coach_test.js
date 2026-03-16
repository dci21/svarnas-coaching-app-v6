const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const athleteEmail = `coachtest_ath_${Date.now()}@testlocal.dev`;
const coachEmail = `coachtest_co_${Date.now()}@testlocal.dev`;
const secondAthleteEmail = `coachtest_ath2_${Date.now()}@testlocal.dev`;
const testPass = 'Rt44!xyz';

let athleteToken = null;
let coachToken = null;
let secondAthleteToken = null;
let coachUserId = null;
let athleteUserId = null;

beforeAll(async () => {
  await request(app).post('/api/signup').send({ email: athleteEmail, pass: testPass });
  await request(app).post('/api/signup').send({ email: coachEmail, pass: testPass });
  await request(app).post('/api/signup').send({ email: secondAthleteEmail, pass: testPass });

  const athRes = await request(app).post('/api/signin').send({ email: athleteEmail, pass: testPass });
  athleteToken = athRes.body.jwt_token;

  const coachRes = await request(app).post('/api/signin').send({ email: coachEmail, pass: testPass });
  coachToken = coachRes.body.jwt_token;

  const ath2Res = await request(app).post('/api/signin').send({ email: secondAthleteEmail, pass: testPass });
  secondAthleteToken = ath2Res.body.jwt_token;

  const coachRow = await pool.query('SELECT user_id FROM users WHERE email = $1', [coachEmail]);
  coachUserId = coachRow.rows[0].user_id;

  const athRow = await pool.query('SELECT user_id FROM users WHERE email = $1', [athleteEmail]);
  athleteUserId = athRow.rows[0].user_id;

  await pool.query('UPDATE users SET role = $1 WHERE user_id = $2', ['coach', coachUserId]);

  const freshCoachRes = await request(app).post('/api/signin').send({ email: coachEmail, pass: testPass });
  coachToken = freshCoachRes.body.jwt_token;

  await request(app)
    .put('/api/profile')
    .set('Authorization', 'Bearer ' + athleteToken)
    .send({ how_we_call_you: 'TestAthlete', level: 'novice', goal_distance: '10k', availability: ['mon', 'wed'] });

  await request(app)
    .put('/api/profile')
    .set('Authorization', 'Bearer ' + coachToken)
    .send({ how_we_call_you: 'CoachMike' });
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3)',
    [athleteEmail, coachEmail, secondAthleteEmail]);
  await pool.end();
});

describe('GET /api/coach/list-coaches', () => {
  it('return users with the role coach', async () => {
    const res = await request(app)
      .get('/api/coach/list-coaches')
      .set('Authorization', 'Bearer ' + athleteToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find(c => c.user_id === coachUserId);
    expect(found).toBeDefined();
    expect(found.how_we_call_you).toBe('CoachMike');
  });
});

describe('PUT /api/coach/set-coach', () => {
  it('a user links coach', async () => {
    const res = await request(app)
      .put('/api/coach/set-coach')
      .set('Authorization', 'Bearer ' + athleteToken)
      .send({ coach_id: coachUserId });

    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.coach_id).toBe(coachUserId);
  });

  it('self coaching is not allowed', async () => {
    const res = await request(app)
      .put('/api/coach/set-coach')
      .set('Authorization', 'Bearer ' + coachToken)
      .send({ coach_id: coachUserId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('self coaching not allowed');
  });

  it('try to link a coach that does not exist not accepted', async () => {
    const res = await request(app)
      .put('/api/coach/set-coach')
      .set('Authorization', 'Bearer ' + athleteToken)
      .send({ coach_id: 999999 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('no coach with this id');
  });

  it('user can change coach', async () => {
    const res = await request(app)
      .put('/api/coach/set-coach')
      .set('Authorization', 'Bearer ' + athleteToken)
      .send({ coach_id: coachUserId });

    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
  });
});

describe('GET /api/coach/linked-coach', () => {
  it('GET /api/coach/linked-coach returning the linked coach', async () => {
    const res = await request(app)
      .get('/api/coach/linked-coach')
      .set('Authorization', 'Bearer ' + athleteToken);

    expect(res.status).toBe(200);
    expect(res.body.coach).not.toBeNull();
    expect(res.body.coach.user_id).toBe(coachUserId);
    expect(res.body.coach.how_we_call_you).toBe('CoachMike');
  });
});

describe('GET /api/coach/linked-athletes', () => {
  it('listof the athletes linked to the coach', async () => {
    const res = await request(app)
      .get('/api/coach/linked-athletes')
      .set('Authorization', 'Bearer ' + coachToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ath = res.body.find(a => a.athlete_id === athleteUserId);
    expect(ath).toBeDefined();
    expect(ath.how_we_call_you).toBe('TestAthlete');
    expect(ath.level).toBe('novice');
  });

  it('a user without the roal coach can not be linked with athletes', async () => {
    const res = await request(app)
      .get('/api/coach/linked-athletes')
      .set('Authorization', 'Bearer ' + secondAthleteToken);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('athletes can be viewed only by coaches who are linked with');
  });
});

describe('DELETE /api/coach/remove-coach', () => {
  it('user can remove coach', async () => {
    const res = await request(app)
      .delete('/api/coach/remove-coach')
      .set('Authorization', 'Bearer ' + athleteToken);

    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(true);

    const check = await request(app)
      .get('/api/coach/linked-coach')
      .set('Authorization', 'Bearer ' + athleteToken);
    expect(check.body.coach).toBeNull();
  });
});
