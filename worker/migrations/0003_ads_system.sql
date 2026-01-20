-- Migration: 0003_ads_system.sql
-- Ad system for sponsors and Google AdSense fallback

-- Sponsors table (companies/organizations)
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_is TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('municipality', 'recycling', 'sustainability', 'retail', 'utility', 'nonprofit')),
  contact_email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

-- Campaigns table (sponsor ad campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Targeting (JSON arrays, null = all)
  target_bins TEXT,
  target_regions TEXT,

  -- Creative content (Icelandic)
  headline_is TEXT NOT NULL,
  body_is TEXT,
  cta_text_is TEXT DEFAULT 'Læra meira',
  cta_url TEXT,
  image_url TEXT,

  -- Scheduling
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  daily_impression_limit INTEGER,
  total_impression_limit INTEGER,

  -- Placement
  placement TEXT NOT NULL CHECK (placement IN ('result_banner', 'stats_card', 'quiz_reward', 'splash')),
  priority INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),

  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_placement ON campaigns(placement, priority DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_sponsor ON campaigns(sponsor_id);

-- Impressions tracking
CREATE TABLE IF NOT EXISTS ad_impressions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_hash TEXT NOT NULL,
  placement TEXT NOT NULL,
  context_bin TEXT,
  context_item TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impressions_campaign ON ad_impressions(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_user ON ad_impressions(user_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_date ON ad_impressions(created_at);

-- Click tracking
CREATE TABLE IF NOT EXISTS ad_clicks (
  id TEXT PRIMARY KEY,
  impression_id TEXT NOT NULL REFERENCES ad_impressions(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  user_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON ad_clicks(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_impression ON ad_clicks(impression_id);

-- Daily aggregated stats (for reporting)
CREATE TABLE IF NOT EXISTS ad_stats_daily (
  date TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  PRIMARY KEY (date, campaign_id)
);

-- Insert initial sponsors (Litla Gámaleigan and 2076)
INSERT OR IGNORE INTO sponsors (id, name, name_is, logo_url, website_url, category, is_active, created_at)
VALUES
  ('sponsor_litla', 'Litla Gámaleigan', 'Litla Gámaleigan', 'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100''%3E%3Crect fill=''%232563eb'' width=''100'' height=''100'' rx=''10''/%3E%3Ctext x=''50'' y=''55'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''36'' font-weight=''bold'' fill=''white''%3ELG%3C/text%3E%3C/svg%3E', 'https://litla.gamaleigan.is', 'recycling', 1, unixepoch()),
  ('sponsor_2076', '2076 ehf', '2076 ehf', 'data:image/svg+xml,%3Csvg xmlns=''http://www.w3.org/2000/svg'' viewBox=''0 0 100 100''%3E%3Crect fill=''%2310b981'' width=''100'' height=''100'' rx=''10''/%3E%3Ctext x=''50'' y=''60'' text-anchor=''middle'' font-family=''Arial, sans-serif'' font-size=''28'' font-weight=''bold'' fill=''white''%3E2076%3C/text%3E%3C/svg%3E', 'https://2076.is', 'sustainability', 1, unixepoch());

-- Insert initial campaigns
INSERT OR IGNORE INTO campaigns (id, sponsor_id, name, headline_is, body_is, cta_text_is, cta_url, start_date, end_date, placement, priority, status, created_at)
VALUES
  ('camp_litla_1', 'sponsor_litla', 'Litla Gámaleigan - Launch', 'Þarftu gám? Við erum með!', 'Gámaleiga fyrir alla - stór og smá verkefni', 'Panta gám', 'https://litla.gamaleigan.is', '2025-01-01', '2026-12-31', 'result_banner', 10, 'active', unixepoch()),
  ('camp_2076_1', 'sponsor_2076', '2076 - Tech Partner', 'Þróað af 2076 ehf', 'Við leysum vandamál með tækni', 'Læra meira', 'https://2076.is', '2025-01-01', '2026-12-31', 'stats_card', 5, 'active', unixepoch());
