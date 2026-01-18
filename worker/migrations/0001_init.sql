-- trash-myx D1 Schema
-- Run with: wrangler d1 execute trash-myx-db --file=./migrations/0001_init.sql

-- Skannanir (Scans table)
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
  lng REAL,
  source TEXT DEFAULT 'pwa'
);

CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_hash);
CREATE INDEX IF NOT EXISTS idx_scans_date ON scans(created_at);
CREATE INDEX IF NOT EXISTS idx_scans_bin ON scans(bin);

-- Notendur (Users table - anonymous gamification)
CREATE TABLE IF NOT EXISTS users (
  user_hash TEXT PRIMARY KEY,
  total_scans INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_scan_date TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Fun facts table
CREATE TABLE IF NOT EXISTS fun_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_is TEXT NOT NULL,
  category TEXT DEFAULT 'general'
);

-- Initial fun facts
INSERT INTO fun_facts (fact_is, category) VALUES
  ('Ein plastflaska tekur allt að 450 ár að brotna niður.', 'plastic'),
  ('Endurvinnsla á einni álumbúð sparar næga orku til að keyra sjónvarp í 3 klst.', 'metal'),
  ('3D prentað plast brotnar aðeins niður við 50+ gráðu hita.', '3d_print'),
  ('Gler má endurvinna endalaust án þess að tapa gæðum.', 'glass'),
  ('Pappír má endurnýta 5-7 sinnum áður en trefjarnir verða of stuttar.', 'paper'),
  ('Matarúrgangur á Íslandi framleiðir metangas sem er 25x verri en CO2.', 'food'),
  ('Íslendingar framleiða um 500kg af úrgangi á mann á ári.', 'general'),
  ('Skilagjaldskerfið safnar um 90% af öllum dósum og flöskum á Íslandi.', 'deposit'),
  ('SORPA brennir um 100.000 tonn af úrgangi á ári til að framleiða rafmagn.', 'general'),
  ('Einn líter af olíu getur mengað allt að 1 milljón lítra af vatni.', 'recycling_center'),
  ('Rafhlöður innihalda þungmálma sem eru mjög skaðlegir umhverfinu.', 'recycling_center');
