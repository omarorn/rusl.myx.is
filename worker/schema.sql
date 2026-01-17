-- =============================================
-- RUSL.MYX.IS Database Schema
-- Íslensk ruslaflokkun með gervigreind
-- =============================================

-- Skannanir (PWA + TrashPi)
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  created_at INTEGER DEFAULT (unixepoch()),
  device_type TEXT NOT NULL CHECK (device_type IN ('pwa', 'trashpi')),
  device_id TEXT NOT NULL,
  item TEXT NOT NULL,
  bin TEXT NOT NULL,
  confidence REAL,
  sveitarfelag TEXT DEFAULT 'reykjavik',
  image_key TEXT,
  lat REAL,
  lng REAL,
  model_used TEXT DEFAULT 'trashnet'
);

CREATE INDEX IF NOT EXISTS idx_scans_device ON scans(device_id);
CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_bin ON scans(bin);
-- Tæki (TrashPi boxes)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  device_type TEXT NOT NULL,
  name TEXT,
  sveitarfelag TEXT DEFAULT 'reykjavik',
  location TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  last_seen INTEGER,
  total_scans INTEGER DEFAULT 0
);

-- Sveitarfélaga reglur
CREATE TABLE IF NOT EXISTS bin_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sveitarfelag TEXT NOT NULL,
  bin_name TEXT NOT NULL,
  bin_name_is TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  examples TEXT,
  UNIQUE(sveitarfelag, bin_name)
);

-- Fun facts fyrir gamification
CREATE TABLE IF NOT EXISTS fun_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_is TEXT NOT NULL,
  category TEXT
);
