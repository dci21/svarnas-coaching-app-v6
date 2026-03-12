CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'admin');
CREATE TYPE running_level AS ENUM ('novice', 'intermediate', 'advanced');
CREATE TYPE race_distance AS ENUM ('5k', '10k', 'hm', 'marathon');

CREATE TABLE users (
  user_id     SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  hashed_pass TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'athlete',
  created     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- empty profile row is created at signup so later queries can left join without null checks
CREATE TABLE profiles (
  profile_id          SERIAL PRIMARY KEY,
  user_id             INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  private_first_name  VARCHAR(100),
  private_last_name   VARCHAR(100),
  how_we_call_you     VARCHAR(150),
  public_name         VARCHAR(150),
  level               running_level,
  goal_distance       race_distance,
  race_date           DATE,
  runs_per_week       INTEGER,
  availability        JSONB,
  long_run_day        VARCHAR(10)
);

CREATE TABLE coaching (
  linking_id  SERIAL PRIMARY KEY,
  coach_id    INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  athlete_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(athlete_id)
);

CREATE TABLE generated_training_plans (
  plan_id               SERIAL PRIMARY KEY,
  athlete_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  training_plan         JSONB NOT NULL,
  generation_metadata   JSONB,
  created               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shared_plans (
  share_id    SERIAL PRIMARY KEY,
  plan_id     INTEGER NOT NULL REFERENCES generated_training_plans(plan_id) ON DELETE CASCADE,
  link        VARCHAR(100) UNIQUE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created     TIMESTAMPTZ NOT NULL DEFAULT now()
);
