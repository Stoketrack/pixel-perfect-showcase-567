/*
# Create TokenTrack persistent storage tables

## Purpose
Migrate TokenTrack by MAD from browser-only localStorage to persistent Supabase
database storage. The published and development apps share the same data source.

## New Tables

### `tokentrack_platforms`
Stores the six configurable platform profiles (Chaturbate, Cam4, BongaCams,
Stripchat, CamSoda, open slot). Replaces the `platforms` array in localStorage.
- `id` (text, primary key) — stable platform identity, e.g. "pf-chaturbate"
- `name` (text) — underlying platform identity
- `display_name` (text) — short editable dashboard label
- `status` (text) — active | testing | inactive
- `slot` (int) — dashboard display position 1..6
- `input_mode` (text) — tokens | usd | tokens_and_usd
- `token_value_usd` (numeric, nullable) — USD per token, platform-specific
- `opening_balance_usd` (numeric) — verified opening balance
- `opening_date` (date) — ISO date of opening balance
- `accent` (text) — accent color token
- `payout_destination` (text, nullable) — e.g. "Coins.ph" or "Wise"
- `payout_info` (text, nullable) — free-text payout information
- `created_at`, `updated_at` (timestamptz)

### `tokentrack_entries`
Daily session/entry rows per platform. Replaces the `rows` array in localStorage.
- `id` (text, primary key) — stable row id from the client
- `platform_id` (text, FK → tokentrack_platforms ON DELETE CASCADE)
- `date` (date) — ISO date the record belongs to
- `start_time` (text, nullable) — HH:mm 24h
- `end_time` (text, nullable) — HH:mm 24h
- `time_of_day` (text, nullable) — derived Morning/Afternoon/Evening/Night
- `room_count` (int, nullable)
- `followers_start` (numeric, nullable)
- `followers_end` (numeric, nullable)
- `tokens` (numeric, nullable)
- `usd_actual` (numeric, nullable)
- `followers` (numeric, nullable) — legacy net follower change
- `minutes` (numeric, nullable) — legacy manual duration
- `token_value_usd_at_entry` (numeric, nullable) — rate captured at entry time
- `note` (text)
- `origin` (text) — manual | imported
- `verified` (boolean)
- `import_key` (text, nullable) — dedup natural key
- `import_batch_id` (text, nullable)
- `imported_at` (timestamptz, nullable)
- `created_at`, `updated_at` (timestamptz)

### `tokentrack_payouts`
Payout withdrawals from platform balances. Replaces the `payouts` array.
- `id` (text, primary key)
- `platform_id` (text, FK → tokentrack_platforms ON DELETE CASCADE)
- `date` (date)
- `amount_usd` (numeric) — positive USD withdrawn
- `destination` (text) — captured at payout time
- `usd_php_rate_at_entry` (numeric, nullable) — rate captured at payout time
- `note` (text)
- `created_at` (timestamptz)

## Indexes
- `tokentrack_entries` on (platform_id, date) — dashboard summary queries
- `tokentrack_entries` on (platform_id) — platform detail listing
- `tokentrack_payouts` on (platform_id, date)
- `tokentrack_platforms` on (slot) — dashboard ordering

## Security
Single-tenant app with NO sign-in screen. All policies use `TO anon, authenticated`
with `USING (true)` / `WITH CHECK (true)` because the data is intentionally shared
across the published and development apps. RLS is enabled on every table.
*/

-- ── Platforms ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokentrack_platforms (
  id text PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  slot integer NOT NULL DEFAULT 6,
  input_mode text NOT NULL DEFAULT 'tokens_and_usd',
  token_value_usd numeric,
  opening_balance_usd numeric NOT NULL DEFAULT 0,
  opening_date date NOT NULL DEFAULT '2026-08-01',
  accent text NOT NULL DEFAULT 'var(--color-accent)',
  payout_destination text,
  payout_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tokentrack_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tt_platforms_select" ON tokentrack_platforms;
CREATE POLICY "tt_platforms_select" ON tokentrack_platforms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tt_platforms_insert" ON tokentrack_platforms;
CREATE POLICY "tt_platforms_insert" ON tokentrack_platforms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tt_platforms_update" ON tokentrack_platforms;
CREATE POLICY "tt_platforms_update" ON tokentrack_platforms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tt_platforms_delete" ON tokentrack_platforms;
CREATE POLICY "tt_platforms_delete" ON tokentrack_platforms FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tokentrack_platforms_slot ON tokentrack_platforms (slot);

-- ── Entries ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokentrack_entries (
  id text PRIMARY KEY,
  platform_id text NOT NULL REFERENCES tokentrack_platforms(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time text,
  end_time text,
  time_of_day text,
  room_count integer,
  followers_start numeric,
  followers_end numeric,
  tokens numeric,
  usd_actual numeric,
  followers numeric,
  minutes numeric,
  token_value_usd_at_entry numeric,
  note text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT 'manual',
  verified boolean NOT NULL DEFAULT false,
  import_key text,
  import_batch_id text,
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tokentrack_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tt_entries_select" ON tokentrack_entries;
CREATE POLICY "tt_entries_select" ON tokentrack_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tt_entries_insert" ON tokentrack_entries;
CREATE POLICY "tt_entries_insert" ON tokentrack_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tt_entries_update" ON tokentrack_entries;
CREATE POLICY "tt_entries_update" ON tokentrack_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tt_entries_delete" ON tokentrack_entries;
CREATE POLICY "tt_entries_delete" ON tokentrack_entries FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tokentrack_entries_platform_date ON tokentrack_entries (platform_id, date);
CREATE INDEX IF NOT EXISTS idx_tokentrack_entries_platform ON tokentrack_entries (platform_id);

-- ── Payouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokentrack_payouts (
  id text PRIMARY KEY,
  platform_id text NOT NULL REFERENCES tokentrack_platforms(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount_usd numeric NOT NULL,
  destination text NOT NULL DEFAULT 'Unassigned',
  usd_php_rate_at_entry numeric,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tokentrack_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tt_payouts_select" ON tokentrack_payouts;
CREATE POLICY "tt_payouts_select" ON tokentrack_payouts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tt_payouts_insert" ON tokentrack_payouts;
CREATE POLICY "tt_payouts_insert" ON tokentrack_payouts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tt_payouts_update" ON tokentrack_payouts;
CREATE POLICY "tt_payouts_update" ON tokentrack_payouts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tt_payouts_delete" ON tokentrack_payouts;
CREATE POLICY "tt_payouts_delete" ON tokentrack_payouts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tokentrack_payouts_platform_date ON tokentrack_payouts (platform_id, date);

-- ── updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION tokentrack_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tokentrack_platforms_updated ON tokentrack_platforms;
CREATE TRIGGER trg_tokentrack_platforms_updated
  BEFORE UPDATE ON tokentrack_platforms
  FOR EACH ROW EXECUTE FUNCTION tokentrack_set_updated_at();

DROP TRIGGER IF EXISTS trg_tokentrack_entries_updated ON tokentrack_entries;
CREATE TRIGGER trg_tokentrack_entries_updated
  BEFORE UPDATE ON tokentrack_entries
  FOR EACH ROW EXECUTE FUNCTION tokentrack_set_updated_at();
