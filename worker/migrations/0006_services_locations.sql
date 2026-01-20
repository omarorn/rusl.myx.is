-- Migration: 0005_services_locations.sql
-- Description: Add service types, collection points, and service requests for nonprofit organizations

-- Service types (e.g., Húsfélög, Söfnunarsambönd, Söfnunarskápar)
CREATE TABLE IF NOT EXISTS service_types (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'husfelag' | 'sofnun' | 'skapur'
  name_is TEXT NOT NULL,
  description_is TEXT,
  how_it_works_is TEXT,
  min_quantity INTEGER,
  fee_description_is TEXT,
  icon TEXT,                             -- emoji or icon name
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);

-- Collection points (Söfnunarskápar, grenndarstöðvar, etc.)
CREATE TABLE IF NOT EXISTS collection_points (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT,                       -- NULL if public location (SORPA, etc.)
  name TEXT NOT NULL,
  name_is TEXT NOT NULL,
  type TEXT NOT NULL,                    -- 'sofnunarskapur' | 'grenndarstod' | 'recycling_center' | 'bottle_return'
  region TEXT,                           -- 'hofudborgarsvaedid' | 'akureyri' | 'sudurland' | etc.
  municipality TEXT,                     -- 'Reykjavík' | 'Kópavogur' | etc.
  address TEXT,
  lat REAL,
  lng REAL,
  phone TEXT,
  website_url TEXT,
  opening_hours TEXT,                    -- JSON: {"mon": "10:00-17:00", ...}
  accepts TEXT,                          -- JSON: ["bottles", "cans", "plastic", ...]
  notes_is TEXT,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);

-- Service requests from users/organizations
CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  service_type_id TEXT NOT NULL,
  request_type TEXT NOT NULL,            -- 'husfelag' | 'sofnun' | 'fyrirtaeki'
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  organization_name TEXT,
  organization_type TEXT,                -- 'husfelag' | 'felag' | 'fyrirtaeki' | 'skoli'
  address TEXT,
  municipality TEXT,
  estimated_quantity INTEGER,
  preferred_schedule TEXT,               -- 'weekly' | 'biweekly' | 'monthly' | 'once'
  notes TEXT,
  status TEXT DEFAULT 'pending',         -- 'pending' | 'contacted' | 'active' | 'completed' | 'cancelled'
  admin_notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  contacted_at INTEGER,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Deposit tips for different item types
CREATE TABLE IF NOT EXISTS deposit_tips (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,               -- 'plastic_bottle' | 'aluminum_can' | 'glass_bottle'
  tip_is TEXT NOT NULL,
  tip_en TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_points_region ON collection_points(region);
CREATE INDEX IF NOT EXISTS idx_collection_points_type ON collection_points(type);
CREATE INDEX IF NOT EXISTS idx_collection_points_sponsor ON collection_points(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_collection_points_location ON collection_points(lat, lng);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_type ON service_requests(service_type_id);
CREATE INDEX IF NOT EXISTS idx_service_types_sponsor ON service_types(sponsor_id);

-- =====================================================
-- SEED DATA: Grænir skátar
-- =====================================================

-- Insert Grænir skátar as sponsor (if not exists)
INSERT OR IGNORE INTO sponsors (id, name, name_is, logo_url, website_url, category, contact_email, is_active, created_at)
VALUES (
  'sponsor_graenir_skatar',
  'Green Scouts Iceland',
  'Grænir skátar',
  '/images/sponsors/graenir-skatar.png',
  'https://www.scout.is',
  'nonprofit',
  'graenir@scout.is',
  1,
  unixepoch()
);

-- Insert service types
INSERT OR REPLACE INTO service_types (id, sponsor_id, type, name_is, description_is, how_it_works_is, icon, sort_order, is_active, created_at)
VALUES 
(
  'service_husfelag',
  'sponsor_graenir_skatar',
  'husfelag',
  'Húsfélög',
  'Við tökum að okkur að sækja flöskur og dósir til húsfélaga og telja þær gegn hluta skilagjaldsins en restin er greidd til húsfélagsins.',
  'Við komum með viðeigandi söfnunarílát í sorpgeymslu húsfélagsins og tæmum það eftir þörfum. Með þessu gefst íbúum tækifæri til þess að losna við flöskur og dósir um leið og þeir losa sig við aðra flokka sem fara í sorpgeymsluna.',
  '🏢',
  1,
  1,
  unixepoch()
),
(
  'service_sofnun',
  'sponsor_graenir_skatar',
  'sofnun',
  'Söfnunarsambönd',
  'Við bjóðum upp á heildstæða þjónustu þar sem við sækjum dósirnar á söfnunarstað og sjáum um flokkun og talningu gegn þóknun.',
  'Með þessu sparast mikill tími og óþrifnaður og félög og hópar geta einbeitt sér að söfnuninni sjálfri. Grænir skátar bjóða upp á aðstoða við undirbúning og skipulag söfnunar.',
  '🎪',
  2,
  1,
  unixepoch()
),
(
  'service_skapur',
  'sponsor_graenir_skatar',
  'skapur',
  'Söfnunarskápar',
  'Grænir skátar eru með söfnunarskápa á grenndarstöðvum víðsvegar um landið.',
  'Þú getur skilað flöskum og dósum í söfnunarskápinn og styrkir þar með skátastarfið.',
  '📦',
  3,
  1,
  unixepoch()
);

-- Insert collection points (Söfnunarskápar)
INSERT OR REPLACE INTO collection_points (id, sponsor_id, name, name_is, type, region, municipality, address, is_active, created_at)
VALUES 
-- Höfuðborgarsvæðið
('cp_rvk_grafarvogur', 'sponsor_graenir_skatar', 'Grafarvogur Collection Point', 'Grenndarstöð Grafarvogs', 'sofnunarskapur', 'hofudborgarsvaedid', 'Reykjavík', 'Grafarvogur, Reykjavík', 1, unixepoch()),
('cp_rvk_breidholt', 'sponsor_graenir_skatar', 'Breiðholt Collection Point', 'Grenndarstöð Breiðholts', 'sofnunarskapur', 'hofudborgarsvaedid', 'Reykjavík', 'Breiðholt, Reykjavík', 1, unixepoch()),
('cp_rvk_arbaer', 'sponsor_graenir_skatar', 'Árbær Collection Point', 'Grenndarstöð Árbæjar', 'sofnunarskapur', 'hofudborgarsvaedid', 'Reykjavík', 'Árbær, Reykjavík', 1, unixepoch()),
('cp_kopavogur', 'sponsor_graenir_skatar', 'Kópavogur Collection Point', 'Grenndarstöð Kópavogs', 'sofnunarskapur', 'hofudborgarsvaedid', 'Kópavogur', 'Kópavogur', 1, unixepoch()),
('cp_hafnarfjordur', 'sponsor_graenir_skatar', 'Hafnarfjörður Collection Point', 'Grenndarstöð Hafnarfjarðar', 'sofnunarskapur', 'hofudborgarsvaedid', 'Hafnarfjörður', 'Hafnarfjörður', 1, unixepoch()),
('cp_gardabaer', 'sponsor_graenir_skatar', 'Garðabær Collection Point', 'Grenndarstöð Garðabæjar', 'sofnunarskapur', 'hofudborgarsvaedid', 'Garðabær', 'Garðabær', 1, unixepoch()),
('cp_mosfellsbaer', 'sponsor_graenir_skatar', 'Mosfellsbær Collection Point', 'Grenndarstöð Mosfellsbæjar', 'sofnunarskapur', 'hofudborgarsvaedid', 'Mosfellsbær', 'Mosfellsbær', 1, unixepoch()),

-- Norðurland
('cp_akureyri', 'sponsor_graenir_skatar', 'Akureyri Collection Point', 'Grenndarstöð Akureyrar', 'sofnunarskapur', 'nordurland', 'Akureyri', 'Akureyri', 1, unixepoch()),

-- Suðurnes
('cp_reykjanesbaer', 'sponsor_graenir_skatar', 'Reykjanesbær Collection Point', 'Grenndarstöð Reykjanesbæjar', 'sofnunarskapur', 'sudurnes', 'Reykjanesbær', 'Reykjanesbær', 1, unixepoch()),

-- Suðurland
('cp_selfoss', 'sponsor_graenir_skatar', 'Selfoss Collection Point', 'Grenndarstöð Selfoss', 'sofnunarskapur', 'sudurland', 'Árborg', 'Selfoss', 1, unixepoch()),
('cp_grimsnes', 'sponsor_graenir_skatar', 'Grímsnes Collection Point', 'Grenndarstöð Grímsnes- og Grafningshrepps', 'sofnunarskapur', 'sudurland', 'Grímsnes- og Grafningshreppur', 'Grímsnes- og Grafningshreppur', 1, unixepoch()),
('cp_blaskogabyggd', 'sponsor_graenir_skatar', 'Bláskógabyggð Collection Point', 'Grenndarstöð Bláskógabyggðar', 'sofnunarskapur', 'sudurland', 'Bláskógabyggð', 'Bláskógabyggð', 1, unixepoch());

-- Insert deposit tips
INSERT OR REPLACE INTO deposit_tips (id, item_type, tip_is, tip_en, icon, sort_order, is_active, created_at)
VALUES 
('tip_plastic_bottle', 'plastic_bottle', 'Ekki krumpa flöskuna! Vélin þarf að lesa strikamerkið.', 'Don''t crush the bottle! The machine needs to read the barcode.', '🍾', 1, 1, unixepoch()),
('tip_aluminum_can', 'aluminum_can', 'Dósir mega vera örlítið krumpaðar, en strikamerkið þarf að vera læsilegt.', 'Cans can be slightly crushed, but the barcode must be readable.', '🥫', 2, 1, unixepoch()),
('tip_glass_bottle', 'glass_bottle', 'Glerflöskur með skilagjaldi fara í flöskuskilavél, ekki glertunnu.', 'Glass bottles with deposit go in the bottle return machine, not the glass bin.', '🍷', 3, 1, unixepoch()),
('tip_tetra_pak', 'tetra_pak', 'TetraPak fer í pappír, ekki plast. Skolaðu vel og flattu saman.', 'TetraPak goes in paper, not plastic. Rinse well and flatten.', '🧃', 4, 1, unixepoch());
