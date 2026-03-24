-- =============================================================================
-- CretePulse - Supabase Schema
-- Spec: docs/superpowers/specs/2026-03-24-cretepulse-design.md
-- =============================================================================

-- =============================================================================
-- FUNCTION: update_updated_at
-- Auto-updates the updated_at column on any table that has it.
-- Applied via triggers on beaches, villages, hikes, food_places, events.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLE: beaches
-- ~500 rows. Static content, generated in batch via Claude API.
-- Sources: OpenStreetMap Overpass (natural=beach) + Wikipedia
-- =============================================================================

CREATE TABLE IF NOT EXISTS beaches (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,

  -- Localised names
  name_en          TEXT,
  name_fr          TEXT,
  name_de          TEXT,
  name_el          TEXT,

  -- Geography
  latitude         FLOAT NOT NULL,
  longitude        FLOAT NOT NULL,
  region           TEXT NOT NULL, -- east | west | central | south

  -- Physical characteristics
  type             TEXT,          -- sand | pebble | rock | mixed
  length_m         INT,
  wind_exposure    TEXT,          -- sheltered | moderate | exposed

  -- Amenities (used for beach-conditions scoring client-side)
  parking          BOOLEAN DEFAULT false,
  sunbeds          BOOLEAN DEFAULT false,
  taverna          BOOLEAN DEFAULT false,
  snorkeling       BOOLEAN DEFAULT false,
  kids_friendly    BOOLEAN DEFAULT false,

  -- Localised descriptions
  description_en   TEXT,
  description_fr   TEXT,
  description_de   TEXT,
  description_el   TEXT,

  -- Media
  image_url        TEXT,
  image_credit     TEXT,          -- Wikimedia Commons attribution (mandatory)

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for region-based filtering on /beaches?region=east
CREATE INDEX IF NOT EXISTS idx_beaches_region ON beaches (region);

CREATE TRIGGER trg_beaches_updated
  BEFORE UPDATE ON beaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: villages
-- ~300 rows. Static content, generated in batch.
-- Sources: Wikipedia "List of villages in Crete" + OpenStreetMap
-- =============================================================================

CREATE TABLE IF NOT EXISTS villages (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,

  -- Localised names
  name_en          TEXT,
  name_fr          TEXT,
  name_de          TEXT,
  name_el          TEXT,

  -- Demographics & geography
  population       INT,
  altitude_m       INT,
  latitude         FLOAT NOT NULL,
  longitude        FLOAT NOT NULL,
  region           TEXT NOT NULL,   -- east | west | central | south
  municipality     TEXT,

  -- Historical classification
  period           TEXT,            -- minoan | venetian | ottoman | modern | abandoned

  -- Localised descriptions
  description_en   TEXT,
  description_fr   TEXT,
  description_de   TEXT,
  description_el   TEXT,

  -- Structured highlights (points of interest, notable facts)
  highlights       JSONB DEFAULT '[]',

  -- Media
  image_url        TEXT,
  image_credit     TEXT,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for region-based filtering on /villages?region=east
CREATE INDEX IF NOT EXISTS idx_villages_region ON villages (region);

CREATE TRIGGER trg_villages_updated
  BEFORE UPDATE ON villages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: hikes
-- ~200 rows. Static content, generated in batch.
-- Sources: OpenStreetMap (relations type=route, route=hiking) + waymarkedtrails.org
-- GPX files stored in Supabase Storage, NOT inline in this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS hikes (
  id                  SERIAL PRIMARY KEY,
  slug                TEXT UNIQUE NOT NULL,

  -- Localised names
  name_en             TEXT,
  name_fr             TEXT,
  name_de             TEXT,
  name_el             TEXT,

  -- Route coordinates
  start_lat           FLOAT,
  start_lng           FLOAT,
  end_lat             FLOAT,
  end_lng             FLOAT,

  -- Route stats
  distance_km         FLOAT,
  elevation_gain_m    INT,
  duration_hours      FLOAT,

  -- Classification
  difficulty          TEXT,         -- easy | moderate | hard | expert
  type                TEXT,         -- gorge | coastal | mountain | cultural
  water_available     BOOLEAN DEFAULT false,

  -- Localised descriptions
  description_en      TEXT,
  description_fr      TEXT,
  description_de      TEXT,
  description_el      TEXT,

  -- Path to GPX file in Supabase Storage (e.g. "hikes/samaria-gorge.gpx")
  gpx_storage_path    TEXT,

  -- Media
  image_url           TEXT,

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- No region column on hikes, so no region index.
-- Queries are typically by difficulty or type; add those indexes if needed.

CREATE TRIGGER trg_hikes_updated
  BEFORE UPDATE ON hikes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: food_places
-- ~150 rows. Sourced from OpenStreetMap Overpass API (legal, open data).
-- amenity=restaurant/cafe/fast_food/taverna in Crete bounding box.
-- =============================================================================

CREATE TABLE IF NOT EXISTS food_places (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,

  name             TEXT NOT NULL,
  type             TEXT,            -- restaurant | taverna | market | producer

  -- Geography
  latitude         FLOAT,
  longitude        FLOAT,
  village          TEXT,
  region           TEXT,            -- east | west | central | south

  -- Details
  cuisine          TEXT,
  price_range      TEXT,            -- budget | mid | high

  -- Localised descriptions
  description_en   TEXT,
  description_fr   TEXT,
  description_de   TEXT,
  description_el   TEXT,

  -- Contact & external refs
  phone            TEXT,
  website          TEXT,
  osm_id           TEXT,            -- OpenStreetMap node/way ID for attribution

  -- Media
  image_url        TEXT,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for region-based filtering on /food?region=east
CREATE INDEX IF NOT EXISTS idx_food_region ON food_places (region);

CREATE TRIGGER trg_food_updated
  BEFORE UPDATE ON food_places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: events
-- Ongoing, ~2000/year. Scraped from GTP, Tornos News, mairies + user submissions.
-- Recurring events use iCal RRULE format, parsed client-side with rrule.js.
-- Expired events (date_end < now() - 3 months) get noindex=true via weekly cron.
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,

  -- Localised titles
  title_en         TEXT,
  title_fr         TEXT,
  title_de         TEXT,
  title_el         TEXT,

  -- Localised descriptions
  description_en   TEXT,
  description_fr   TEXT,
  description_de   TEXT,
  description_el   TEXT,

  -- Scheduling
  date_start       DATE NOT NULL,
  date_end         DATE,
  time_start       TIME,

  -- Location
  location_name    TEXT,
  latitude         FLOAT,
  longitude        FLOAT,
  region           TEXT,            -- east | west | central | south

  -- Classification
  category         TEXT,            -- festival | music | food | cultural | sports | market | religious

  -- Source tracing
  source_url       TEXT,
  source_name      TEXT,

  -- Recurrence: iCal RRULE string (e.g. "FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15")
  -- Parsed client-side via rrule.js to display next occurrences.
  is_recurring     BOOLEAN DEFAULT false,
  rrule            TEXT,

  -- Moderation
  submitted_by     TEXT,            -- submitter email (nullable, from /submit-event/)
  verified         BOOLEAN DEFAULT false,  -- false until cron Claude review approves

  -- SEO: set to true by weekly cron when date_end < now() - 3 months
  -- Page stays accessible but meta robots noindex is injected by Next.js
  noindex          BOOLEAN DEFAULT false,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for chronological calendar queries
CREATE INDEX IF NOT EXISTS idx_events_date   ON events (date_start);
-- Index for region-based filtering
CREATE INDEX IF NOT EXISTS idx_events_region ON events (region);

CREATE TRIGGER trg_events_updated
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLE: news
-- Ongoing, ~5-10 articles/day. RSS feeds (Patris.gr, Nea Kriti, Cretapost.gr).
-- Dedup enforced by UNIQUE constraint on source_url.
-- Purged automatically by monthly cron: DELETE WHERE created_at < now() - 6 months
-- =============================================================================

CREATE TABLE IF NOT EXISTS news (
  id               SERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,

  -- Localised titles (original EL + 3 translations by Claude Haiku)
  title_en         TEXT,
  title_fr         TEXT,
  title_de         TEXT,
  title_el         TEXT,

  -- Localised summaries (2-paragraph summaries generated by Claude Haiku)
  summary_en       TEXT,
  summary_fr       TEXT,
  summary_de       TEXT,
  summary_el       TEXT,

  -- Source (UNIQUE ensures no duplicate ingestion of the same article)
  source_url       TEXT UNIQUE NOT NULL,
  source_name      TEXT,
  source_lang      TEXT DEFAULT 'el',  -- language of the original article

  -- Timing
  published_at     TIMESTAMPTZ NOT NULL,  -- original article publication date
  category         TEXT,

  -- Media
  image_url        TEXT,

  created_at       TIMESTAMPTZ DEFAULT now()
);
-- No updated_at on news: records are immutable after insertion

-- Index for chronological news feed queries (DESC = latest first)
CREATE INDEX IF NOT EXISTS idx_news_published ON news (published_at DESC);


-- =============================================================================
-- TABLE: newsletter_subscribers
-- Double opt-in flow: subscribe -> confirm_token email -> /confirm?token=xxx
-- Unsubscribe: /unsubscribe?token=xxx sets unsubscribed_at = now()
-- =============================================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                SERIAL PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,

  -- Preferred locale for segmented sends (EN/FR/DE/EL)
  locale            TEXT DEFAULT 'en',

  -- Subscription lifecycle
  subscribed_at     TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at   TIMESTAMPTZ,           -- NULL = still subscribed

  -- Double opt-in
  confirmed         BOOLEAN DEFAULT false,
  confirm_token     TEXT UNIQUE            -- UUID token sent via Resend, cleared after confirmation
);


-- =============================================================================
-- TABLE: weather_cache
-- Exactly 10 rows (one per city). city_slug is PRIMARY KEY.
-- Cron VPS upserts every hour: ON CONFLICT (city_slug) DO UPDATE
-- Never accumulates history - always 10 rows max.
-- Cities: heraklion, chania, rethymno, agios-nikolaos, ierapetra,
--         sitia, makrigialos, elounda, hersonissos, malia
-- =============================================================================

CREATE TABLE IF NOT EXISTS weather_cache (
  -- city_slug is PK: no SERIAL id, no history, pure upsert table
  city_slug   TEXT PRIMARY KEY,

  -- Full Open-Meteo JSON response (current + 5-day forecast + marine data)
  data        JSONB NOT NULL,

  -- Timestamp of last successful fetch by VPS cron
  fetched_at  TIMESTAMPTZ DEFAULT now()
);

-- No additional indexes needed: all queries are point lookups by city_slug (PK).
