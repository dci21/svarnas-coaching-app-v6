const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const testEmail = `runner_${Date.now()}@testlocal.dev`;
const testPass = 'Kram88!zq';
let savedToken = null;

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
  await pool.end();
});

describe('POST /api/signup', () => {
  it('create new account & profile', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({ email: testEmail, pass: testPass });

    expect(res.status).toBe(201);
    expect(res.body.registered).toBe('succeed');
  });

  it('duplicate email rejected', async () => {
    const res = await request(app)
      .post('/api/signup')
      .send({ email: testEmail, pass: testPass });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email exists');
  });
});

describe('POST /api/signin', () => {
  it('valid credentials, return the token', async () => {
    const res = await request(app)
      .post('/api/signin')
      .send({ email: testEmail, pass: testPass });

    expect(res.status).toBe(200);
    expect(res.body.jwt_token).toBeDefined();
    savedToken = res.body.jwt_token;
  });

  it('wrong pass rejected', async () => {
    const res = await request(app)
      .post('/api/signin')
      .send({ email: testEmail, pass: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid mail or password');
  });

  it('unknown email rejected', async () => {
    const res = await request(app)
      .post('/api/signin')
      .send({ email: 'nobody@nowhere.dev', pass: 'x' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/session', () => {
  it('return user data with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer ' + savedToken);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.role).toBe('athlete');
    expect(res.body).toHaveProperty('how_we_call_you');
  });

  it('request without valid token rejected', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing token');
  });

  it('garbage token rejected', async () => {
    const res = await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer not.a.real.token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorised');
  });
});
