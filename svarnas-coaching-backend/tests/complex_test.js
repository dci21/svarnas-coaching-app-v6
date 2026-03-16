const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const pool = require('../db');

const boundary_mail = 'george@svarnas.com';

describe('cross boundary test', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('if jwt is expired reject the protected endpoints', async () => {
    const expired_token = jwt.sign(
      { user_id: 999, email: boundary_mail, role: 'athlete' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );

    const res = await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer ' + expired_token);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorised');
  });

  it('generate training plan without auth is not accepted', async () => {
    const res = await request(app).post('/api/training-plans/generate');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing token');
  });

  it('view training plan without auth is not accepted', async () => {
    const res = await request(app).get('/api/training-plans');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing token');
  });

  it('create a share link for a training plan without auth is not accepted', async () => {
    const res = await request(app)
      .post('/api/share/create-link')
      .send({ plan_id: 1 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing token');
  });
});
