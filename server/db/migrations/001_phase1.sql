CREATE TYPE member_role AS ENUM ('GM', 'PLAYER');

CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE campaigns (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  role member_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, campaign_id)
);

CREATE UNIQUE INDEX memberships_one_gm ON memberships (campaign_id) WHERE role = 'GM';

CREATE TABLE characters (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  race TEXT NOT NULL DEFAULT '' CHECK (length(race) <= 40),
  char_class TEXT NOT NULL DEFAULT '' CHECK (length(char_class) <= 40),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
  hit_points INTEGER NOT NULL DEFAULT 0 CHECK (hit_points BETWEEN -999 AND 9999),
  ability_scores JSONB NOT NULL DEFAULT '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}',
  gold INTEGER NOT NULL DEFAULT 0 CHECK (gold >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX characters_campaign ON characters (campaign_id);

CREATE TABLE session_notes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 20000),
  session_date DATE NOT NULL,
  is_gm_only BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX session_notes_campaign ON session_notes (campaign_id, session_date DESC);

CREATE TABLE dice_rolls (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expression TEXT NOT NULL CHECK (length(expression) BETWEEN 1 AND 40),
  results INTEGER[] NOT NULL CHECK (cardinality(results) BETWEEN 1 AND 100),
  modifier INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  rolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dice_rolls_campaign ON dice_rolls (campaign_id, rolled_at DESC);
