const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const testEmail = `proftest_${Date.now()}@testlocal.dev`;
const testPass = 'Zx99!mno';
let token = null;

beforeAll(async () => {
  await request(app)
    .post('/api/signup')
    .send({ email: testEmail, pass: testPass });

  const res = await request(app)
    .post('/api/signin')
    .send({ email: testEmail, pass: testPass });

  token = res.body.jwt_token;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  await pool.end();
});

describe('GET /api/profile', () => {
  it('no auth - blocked GET', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
  });

  it('empty profile return for a new user', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).toBe(200);
    expect(res.body.private_first_name).toBeNull();
    expect(res.body.how_we_call_you).toBeNull();
    expect(res.body.level).toBeNull();
  });
});

describe('PUT /api/profile', () => {
  it('no auth - blocked PUT', async () => {
    const res = await request(app)
      .put('/api/profile')
      .send({ how_we_call_you: 'Geo' });
    expect(res.status).toBe(401);
  });

  it('empty body rejection', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no changes send in the body');
  });

  it('bad enum for level rejection - use begginer for test', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ level: 'begginer' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid level enum');
  });

  it('bad enum for goal_distance rejection - use ultramarathon', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ goal_distance: 'ultramarathon' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid goal_distance enum');
  });

  it('available days cant be empty', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ availability: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('At least one day must be selected');
  });

  it('checking if long run day is within available days for training', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ availability: ['mon', 'wed'], long_run_day: 'sun' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Longrun day can not be outside of the Available Days for Training');
  });

  it('bad input from array for availability rejection - ["mon", "tue", "san"]', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ availability: ['mon', 'tue', 'san'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/avaliability/);
  });

  it('successfully saved identity and training fields and also return them back', async () => {
    const payload = {
      private_first_name: 'Giorgos',
      private_last_name: 'Svarnas',
      how_we_call_you: 'Geo',
      public_name: 'G.S.',
      level: 'intermediate',
      goal_distance: 'marathon',
      race_date: '2026-11-08',
      availability: ['mon', 'wed', 'fri', 'sun'],
      long_run_day: 'sun'
    };

    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.how_we_call_you).toBe('Geo');
    expect(res.body.level).toBe('intermediate');
    expect(res.body.goal_distance).toBe('marathon');
    expect(res.body.runs_per_week).toBe(4);
    expect(res.body.availability).toEqual(['mon', 'wed', 'fri', 'sun']);
    expect(res.body.long_run_day).toBe('sun');
  });
});

describe('profile persistence', () => {
  it('GET return PUT after save', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer ' + token);

    expect(res.status).toBe(200);
    expect(res.body.private_first_name).toBe('Giorgos');
    expect(res.body.public_name).toBe('G.S.');
    expect(res.body.goal_distance).toBe('marathon');
    expect(res.body.availability).toEqual(['mon', 'wed', 'fri', 'sun']);
  });

  it('update one field whilre perserving the rest', async () => {
    const res = await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + token)
      .send({ how_we_call_you: 'George' });

    expect(res.status).toBe(200);
    expect(res.body.how_we_call_you).toBe('George');
    expect(res.body.level).toBe('intermediate');
  });
});
