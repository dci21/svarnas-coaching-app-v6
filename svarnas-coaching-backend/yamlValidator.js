const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TRAINING_TEMPLATE_DIR = path.join(__dirname, 'src', 'training_plan_templates', 'running');

// takes the distance and level and search for the yaml file in the template folder then parses the yaml to a JS object
function yamlToJs(distance, level) {
  const filePath = path.join(TRAINING_TEMPLATE_DIR, `${distance}_${level}.yaml`);
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    return yaml.load(raw);
  } catch {
    throw new Error('yaml template contains wrong data format');
  }
}

// takes a yaml template and check that the template meets the requirements for the plan generator
function yamlValidation(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('template doesnt have the correct metadata');
  }

  if (!parsed.target_distance || !parsed.levels || !parsed.duration_weeks) {
    throw new Error('template missing distance or level or duration fields');
  }

  if (!Array.isArray(parsed.weeks) || parsed.weeks.length === 0) {
    throw new Error('template has no weeks data');
  }

  for (let w = 0; w < parsed.weeks.length; w++) {
    const week = parsed.weeks[w];
    if (!Array.isArray(week.workouts)) {
      throw new Error('week ' + (w + 1) + ' missing workouts');
    }

    for (let i = 0; i < week.workouts.length; i++) {
      const wo = week.workouts[i];
      if (!wo.workout_id || wo.order_in_week === undefined || wo.importance === undefined) {
        throw new Error('workout fields are incomplete in week ' + (w + 1));
      }
    }
  }

  return true;
}

module.exports = { yamlToJs, yamlValidation, TRAINING_TEMPLATE_DIR };
