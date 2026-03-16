const { generateTrainingPlan, pickWorkoutsForWeek } = require('../helpers/trainingPlanGenerator');
const request = require('supertest');
const app = require('../server');
const pool = require('../db');

const now = new Date();
const threeWeeksLater = new Date(now.getTime() + 3 * 7 * 24 * 60 * 60 * 1000);
const raceDate = threeWeeksLater.toISOString().slice(0, 10);

const farFuture = new Date(now.getTime() + 52 * 7 * 24 * 60 * 60 * 1000);
const farRaceDate = farFuture.toISOString().slice(0, 10);

const test_profile = {
  level: 'intermediate',
  goal_distance: 'marathon',
  race_date: raceDate,
  availability: ['mon', 'wed', 'fri', 'sat'],
  long_run_day: 'sat',
  runs_per_week: 4
};

describe('generateTrainingPlan', () => {
  it('the correct training plan is sellected', () => {
    const result = generateTrainingPlan(test_profile);
    expect(result.ok).toBe(true);
    expect(result.generation_metadata.distance).toBe('marathon');
    expect(result.generation_metadata.level).toBe('intermediate');
    expect(result.generation_metadata.template_id).toMatch(/marathon/);
  });

  it('respected the runs_per_week of the user', () => {
    const result = generateTrainingPlan(test_profile);
    expect(result.ok).toBe(true);
    for (const week of result.training_plan.weeks) {
      expect(week.workouts.length).toBeLessThanOrEqual(test_profile.runs_per_week);
    }
  });

  it('respected the long_run_day of the user', () => {
    const result = generateTrainingPlan(test_profile);
    expect(result.ok).toBe(true);
    for (const week of result.training_plan.weeks) {
      const longRun = week.workouts.find(w => w.category === 'long_run');
      if (longRun) {
        expect(longRun.day).toBe(test_profile.long_run_day);
      }
    }
  });

  it('respected the order_in_week', () => {
    const result = generateTrainingPlan(test_profile);
    expect(result.ok).toBe(true);
    for (const week of result.training_plan.weeks) {
      const nonLongRun = week.workouts.filter(w => w.category !== 'long_run');
      for (let i = 1; i < nonLongRun.length; i++) {
        expect(nonLongRun[i].order_in_week).toBeGreaterThanOrEqual(nonLongRun[i - 1].order_in_week);
      }
    }
  });

  it('cant generate plan when race day is > than duration_weeks', () => {
    const farProfile = { ...test_profile, race_date: farRaceDate };
    const result = generateTrainingPlan(farProfile);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/can not be generated more than/);
  });
});

const testEmail = `plangentest_${Date.now()}@testlocal.dev`;
const emptyProfileEmail = `plangentest_empty_${Date.now()}@testlocal.dev`;
const testPass = 'Xk99!abc';
let testToken = null;
let emptyToken = null;

describe('/api/training-plans', () => {
  beforeAll(async () => {
    await request(app).post('/api/signup').send({ email: testEmail, pass: testPass });
    await request(app).post('/api/signup').send({ email: emptyProfileEmail, pass: testPass });

    const loginRes = await request(app).post('/api/signin').send({ email: testEmail, pass: testPass });
    testToken = loginRes.body.jwt_token;

    const emptyLoginRes = await request(app).post('/api/signin').send({ email: emptyProfileEmail, pass: testPass });
    emptyToken = emptyLoginRes.body.jwt_token;

    await request(app)
      .put('/api/profile')
      .set('Authorization', 'Bearer ' + testToken)
      .send({
        level: 'intermediate',
        goal_distance: 'marathon',
        race_date: raceDate,
        availability: ['mon', 'wed', 'fri', 'sat'],
        long_run_day: 'sat'
      });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail, emptyProfileEmail]);
    await pool.end();
  });

  it('generate and retrieve a plan by id', async () => {
    const genRes = await request(app)
      .post('/api/training-plans/generate')
      .set('Authorization', 'Bearer ' + testToken);

    expect(genRes.status).toBe(201);
    expect(genRes.body.plan_id).toBeDefined();
    expect(genRes.body.training_plan).toBeDefined();

    const fetchRes = await request(app)
      .get('/api/training-plans/' + genRes.body.plan_id)
      .set('Authorization', 'Bearer ' + testToken);

    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.plan_id).toBe(genRes.body.plan_id);
    expect(fetchRes.body.training_plan.weeks).toBeDefined();
  });

  it('cant generate plan when profile data missing', async () => {
    const res = await request(app)
      .post('/api/training-plans/generate')
      .set('Authorization', 'Bearer ' + emptyToken);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/you cant generate/);
  });
});
