const { yamlToJs, yamlValidation } = require('./yamlValidator');

// how the algorithm is picking the workouts from the templates
function pickWorkoutsForWeek(week, runs_per_week, long_run_day, availability) {
  const allWorkouts = [...week.workouts];

  allWorkouts.sort((a, b) => a.importance - b.importance);

  const most_important_workouts = allWorkouts.slice(0, runs_per_week);

  const availableDays = [...availability];
  const assigned = [];

  // locking the long run day to the athletes constraints
  const longRunWorkout = most_important_workouts.find(w => w.category === 'long_run');

  if (longRunWorkout) {
    assigned.push({ ...longRunWorkout, day: long_run_day });

    const remaining = most_important_workouts.filter(w => w !== longRunWorkout);
    const remainingDays = availableDays.filter(d => d !== long_run_day);

    remaining.sort((a, b) => a.order_in_week - b.order_in_week);

    for (let i = 0; i < remaining.length; i++) {
      if (i < remainingDays.length) {
        assigned.push({ ...remaining[i], day: remainingDays[i] });
      }
    }
  } else {
    most_important_workouts.sort((a, b) => a.order_in_week - b.order_in_week);

    for (let i = 0; i < most_important_workouts.length; i++) {
      if (i < availableDays.length) {
        assigned.push({ ...most_important_workouts[i], day: availableDays[i] });
      }
    }
  }

  return assigned;
}

function generateTrainingPlan(profile) {
  const { level, goal_distance, race_date, availability, long_run_day, runs_per_week } = profile;

  let yaml_template_data;
  try {
    yaml_template_data = yamlToJs(goal_distance, level);
  } catch {
    return {
      ok: false,
      error: `no training plan is found for ${level} for ${goal_distance}. Consider creating it.`
    };
  }

  yamlValidation(yaml_template_data);

  // check if race date is further than the duration_weeks of the template
  const now = new Date();
  const raceDate = new Date(race_date);
  const diffMs = raceDate - now;
  const weeks_to_race_date = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (weeks_to_race_date > yaml_template_data.duration_weeks) {
    return {
      ok: false,
      error: `the ${level} ${goal_distance} training plan can not be generated more than ${yaml_template_data.duration_weeks} weeks before the race`
    };
  }

  const filtered_weeks = [];
  for (let w = 0; w < yaml_template_data.weeks.length; w++) {
    const week = yaml_template_data.weeks[w];
    const weekWorkouts = pickWorkoutsForWeek(week, runs_per_week, long_run_day, availability);

    filtered_weeks.push({
      week_number: week.week_number,
      theme: week.theme,
      week_notes: week.week_notes,
      workouts: weekWorkouts
    });
  }

  const generation_metadata = {
    template_id: yaml_template_data.template_id,
    distance: goal_distance,
    level,
    race_date,
    availability,
    long_run_day,
    runs_per_week,
    generated_at: new Date().toISOString()
  };

  return {
    ok: true,
    training_plan: { weeks: filtered_weeks },
    generation_metadata
  };
}

module.exports = { generateTrainingPlan, pickWorkoutsForWeek };
