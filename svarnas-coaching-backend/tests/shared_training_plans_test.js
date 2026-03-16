const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const now = new Date();
const threeWeeksLater = new Date(now.getTime() + 3 * 7 * 24 * 60 * 60 * 1000);
const raceDate = threeWeeksLater.toISOString().slice(0, 10);

const ownerEmail = `sharetest_${Date.now()}@testlocal.dev`;
const otherEmail = `sharetest_other_${Date.now()}@testlocal.dev`;
const testPass = 'Xk99!abc';
let ownerToken = null;
let otherToken = null;
let planId = null;

describe('/api/share', () => {
  beforeAll(async () => {
    await request(app).post('/api/signup').send({ email: ownerEmail, pass: testPass });
    await request(app).post('/api/signup').send({ email: otherEmail, pass: testPass });

    const ownerLogin = await request(app).post('/api/signin').send({ email: ownerEmail, pass: testPass });
    ownerToken = ownerLogin.body.jwt_token;

    const otherLogin = await request(app).post('/api/signin').send({ email: otherEmail, pass: testPass });
    otherToken = otherLogin.body.jwt_token;

    await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({
        level: 'intermediate',
        goal_distance: 'marathon',
        race_date: raceDate,
        availability: ['mon', 'wed', 'fri', 'sat'],
        long_run_day: 'sat',
        public_name: 'TestRunner'
      });

    const genRes = await request(app)
      .post('/api/training-plans/generate')
      .set('Authorization', 'Bearer ' + ownerToken);

    planId = genRes.body.plan_id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [ownerEmail, otherEmail]);
    await pool.end();
  });

  it('training plan link success', async () => {
    const res = await request(app)
      .post('/api/share/create-link')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ plan_id: planId });

    expect(res.status).toBe(201);
    expect(res.body.share_id).toBeDefined();
    expect(res.body.link).toBeDefined();
    expect(res.body.link.length).toBe(16);
  });

  it('the shared training plan shows only the public name of the user', async () => {
    const linkRes = await request(app)
      .post('/api/share/create-link')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ plan_id: planId });

    const slug = linkRes.body.link;

    const publicRes = await request(app).get('/api/share/' + slug);

    expect(publicRes.status).toBe(200);
    expect(publicRes.body.public_name).toBe('TestRunner');
    expect(publicRes.body.training_plan).toBeDefined();
    expect(publicRes.body.generation_metadata).toBeDefined();
    expect(publicRes.body.email).toBeUndefined();
    expect(publicRes.body.private_first_name).toBeUndefined();
    expect(publicRes.body.private_last_name).toBeUndefined();
  });

  it('revoked share link should return an error', async () => {
    const linkRes = await request(app)
      .post('/api/share/create-link')
      .set('Authorization', 'Bearer ' + ownerToken)
      .send({ plan_id: planId });

    const shareId = linkRes.body.share_id;
    const slug = linkRes.body.link;

    await request(app)
      .delete('/api/share/' + shareId)
      .set('Authorization', 'Bearer ' + ownerToken);

    const publicRes = await request(app).get('/api/share/' + slug);
    expect(publicRes.status).toBe(410);
    expect(publicRes.body.error).toBe('training plan is not active');
  });

  it('cant generate training plan link if you dont own the training plan', async () => {
    const res = await request(app)
      .post('/api/share/create-link')
      .set('Authorization', 'Bearer ' + otherToken)
      .send({ plan_id: planId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('cant find the training plan for sharing');
  });

  it('wrong slug returns not found error', async () => {
    const res = await request(app).get('/api/share/doesnotexist123');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('no such plan exists');
  });
});
