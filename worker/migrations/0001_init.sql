-- trash-myx D1 Schema
-- Run with: wrangler d1 execute trash-myx-db --file=./migrations/0001_init.sql

-- Skannanir
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  created_at INTEGER DEFAULT (unixepoch()),
  user_hash TEXT NOT NULL,
  item TEXT NOT NULL,
  bin TEXT NOT NULL,
  confidence REAL,
  sveitarfelag TEXT DEFAULT 'reykjavik',
  image_key TEXT,
  lat REAL,
  lng REAL
);

CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_hash);
CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(created_at);

-- Notendur (anonymous gamification)
CREATE TABLE IF NOT EXISTS users (
  user_hash TEXT PRIMARY KEY,
  total_scans INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_scan_date TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Fun facts
CREATE TABLE IF NOT EXISTS fun_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_is TEXT NOT NULL,
  category TEXT DEFAULT 'general'
);

-- Initial fun facts
INSERT INTO fun_facts (fact_is, category) VALUES 
  ('Ein plastflaska tekur allt ad 450 ar ad brotna nidur.', 'plastic'),
  ('Endurvinnsla a einni albrusa sparar orku fyrir 3 klst sjonvarp.', 'metal'),
  ('3D prentad plast brotnar adeins nidur vid 50+ gradu hita.', '3d_print'),
  ('Gler ma endurvinna endalaust an thess ad tapa gaedum.', 'glass');
