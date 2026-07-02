-- Run this in Supabase Dashboard → SQL Editor
-- Creates all tables with Row Level Security enabled

-- ── Calendar events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  time        TEXT        NOT NULL DEFAULT '',
  location    TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#3B6FA0',
  date        TEXT        NOT NULL, -- ISO date string "yyyy-MM-dd"
  goal_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own events"
  ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- ── Goals ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goals (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  color       TEXT        NOT NULL DEFAULT '#C4581B',
  deadline    TEXT,       -- "yyyy-MM-dd"
  tasks       JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own goals"
  ON goals FOR ALL USING (auth.uid() = user_id);

-- ── Finance transactions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_transactions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('entrada','saida','diario','economia','cartao')),
  description TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  date        TEXT        NOT NULL, -- "yyyy-MM-dd"
  card_id     TEXT,
  recurrence  TEXT        NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','monthly')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own transactions"
  ON finance_transactions FOR ALL USING (auth.uid() = user_id);

-- ── Credit cards ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_cards (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  closing_day  INTEGER     NOT NULL,
  due_day      INTEGER     NOT NULL,
  "limit"      NUMERIC     NOT NULL DEFAULT 0,
  color        TEXT        NOT NULL DEFAULT '#8B47FF',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own cards"
  ON credit_cards FOR ALL USING (auth.uid() = user_id);

-- ── Exchange config ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_config (
  user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  country          TEXT        NOT NULL DEFAULT '',
  city             TEXT        NOT NULL DEFAULT '',
  currency         TEXT        NOT NULL DEFAULT 'EUR',
  currency_symbol  TEXT        NOT NULL DEFAULT '€',
  exchange_rate    NUMERIC     NOT NULL DEFAULT 5.85,
  budget           NUMERIC     NOT NULL DEFAULT 0,
  start_date       TEXT        NOT NULL DEFAULT '',
  end_date         TEXT        NOT NULL DEFAULT '',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exchange_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own exchange config"
  ON exchange_config FOR ALL USING (auth.uid() = user_id);

-- ── Wishlist places ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wishlist_places (
  id         TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'other',
  notes      TEXT        NOT NULL DEFAULT '',
  visited    BOOLEAN     NOT NULL DEFAULT FALSE,
  lat        NUMERIC,
  lng        NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wishlist_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own places"
  ON wishlist_places FOR ALL USING (auth.uid() = user_id);

-- ── Itinerary items ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS itinerary_items (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'other',
  title       TEXT        NOT NULL,
  date        TEXT        NOT NULL,
  start_time  TEXT,
  end_time    TEXT,
  location    TEXT,
  notes       TEXT,
  place_id    TEXT,
  confirmed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own itinerary"
  ON itinerary_items FOR ALL USING (auth.uid() = user_id);

-- ── Exchange transactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_transactions (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  date        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'outros',
  type        TEXT        NOT NULL DEFAULT 'expense' CHECK (type IN ('expense','income')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own exchange transactions"
  ON exchange_transactions FOR ALL USING (auth.uid() = user_id);

-- ── Helper: auto-update updated_at ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_goals_updated_at           BEFORE UPDATE ON goals           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
