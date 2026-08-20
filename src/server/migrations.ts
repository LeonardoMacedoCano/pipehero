export interface Migration {
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    name: "0001_users_and_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_sub TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    name: "0002_scores_and_achievements",
    sql: `
      CREATE TABLE IF NOT EXISTS song_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        song_id TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        stars SMALLINT NOT NULL CHECK (stars BETWEEN 0 AND 5),
        achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, song_id, difficulty)
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, code)
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        calibration_ms INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
  {
    name: "0003_user_settings_preferences",
    sql: `
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme_id TEXT;
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS key_bindings JSONB;
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS strum_mode_enabled BOOLEAN;
    `,
  },
  {
    name: "0004_user_settings_graphics_quality",
    sql: `
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS graphics_quality TEXT;
    `,
  },
  {
    name: "0005_friendships",
    sql: `
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        responded_at TIMESTAMPTZ,
        CHECK (requester_id <> addressee_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
        ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

      CREATE INDEX IF NOT EXISTS friendships_addressee_status_idx ON friendships (addressee_id, status);
      CREATE INDEX IF NOT EXISTS friendships_requester_status_idx ON friendships (requester_id, status);
    `,
  },
  {
    name: "0006_user_settings_theme_effect",
    sql: `
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme_effect_id TEXT;
    `,
  },
  {
    name: "0007_economy_core",
    sql: `
      CREATE TABLE IF NOT EXISTS user_economy (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_login_date DATE,
        streak_grace_available BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS user_daily_missions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mission_code TEXT NOT NULL,
        mission_day DATE NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, mission_code, mission_day)
      );

      CREATE INDEX IF NOT EXISTS user_daily_missions_user_day_idx
        ON user_daily_missions (user_id, mission_day);

      CREATE TABLE IF NOT EXISTS user_daily_song_plays (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        play_day DATE NOT NULL,
        song_id TEXT NOT NULL,
        PRIMARY KEY (user_id, play_day, song_id)
      );
    `,
  },
  {
    name: "0008_weekly_missions",
    sql: `
      CREATE TABLE IF NOT EXISTS user_weekly_missions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mission_code TEXT NOT NULL,
        week_start DATE NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, mission_code, week_start)
      );

      CREATE INDEX IF NOT EXISTS user_weekly_missions_user_week_idx
        ON user_weekly_missions (user_id, week_start);
    `,
  },
];
