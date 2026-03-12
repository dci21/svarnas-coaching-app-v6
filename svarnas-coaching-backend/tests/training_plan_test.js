const { yamlToJs, yamlValidation } = require('../yamlValidator');

let template;

beforeAll(() => {
  template = yamlToJs('marathon', 'intermediate');
});

it('load the marathon_intermediate template and pares is is as valid JS object', () => {
  expect(template).toBeDefined();
  expect(typeof template).toBe('object');
  yamlValidation(template);
});

it('training plan metadata are valid', () => {
  expect(template.template_id).toBeDefined();
  expect(template.target_distance).toBe('marathon');
  expect(template.levels).toContain('intermediate');
  expect(template.duration_weeks).toBeGreaterThan(0);
  expect(template.sport).toBe('run');
});

it('check that a training plan template has weeks and workouts', () => {
  expect(Array.isArray(template.weeks)).toBe(true);
  expect(template.weeks.length).toBeGreaterThan(0);

  for (const week of template.weeks) {
    expect(week.week_number).toBeDefined();
    expect(Array.isArray(week.workouts)).toBe(true);
  }
});

it('check that all workouts in a training plan template has workout_id, order_in_week, importance', () => {
  for (const week of template.weeks) {
    for (const workout of week.workouts) {
      expect(workout.workout_id).toBeDefined();
      expect(workout.order_in_week).toBeDefined();
      expect(workout.importance).toBeDefined();
    }
  }
});
