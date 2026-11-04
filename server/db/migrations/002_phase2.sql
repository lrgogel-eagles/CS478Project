CREATE TYPE quest_status AS ENUM ('OPEN', 'ACTIVE', 'COMPLETED', 'FAILED');

CREATE TABLE quests (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  status quest_status NOT NULL DEFAULT 'OPEN',
  reward TEXT NOT NULL DEFAULT '' CHECK (length(reward) <= 200)
);

CREATE INDEX quests_campaign ON quests (campaign_id);

CREATE TABLE npcs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  location TEXT NOT NULL DEFAULT '' CHECK (length(location) <= 120),
  gm_notes TEXT NOT NULL DEFAULT '' CHECK (length(gm_notes) <= 5000)
);

CREATE INDEX npcs_campaign ON npcs (campaign_id);

CREATE TABLE quest_npcs (
  quest_id INTEGER NOT NULL REFERENCES quests (id) ON DELETE CASCADE,
  npc_id INTEGER NOT NULL REFERENCES npcs (id) ON DELETE CASCADE,
  PRIMARY KEY (quest_id, npc_id)
);

CREATE TABLE inventory_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  weight NUMERIC(7, 2) NOT NULL DEFAULT 0 CHECK (weight >= 0)
);

CREATE INDEX inventory_items_character ON inventory_items (character_id);

CREATE TABLE calendar_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE INDEX calendar_events_campaign ON calendar_events (campaign_id, starts_at);
