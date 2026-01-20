-- SORPA Trips Feature
-- Run: npx wrangler d1 execute trash-myx-db --local --file=./migrations/0005_sorpa_trips.sql

-- Stations table
CREATE TABLE IF NOT EXISTS sorpa_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  type TEXT DEFAULT 'endurvinnslustod',
  opening_hours TEXT,
  aerial_image_url TEXT,
  traffic_flow TEXT DEFAULT 'counterclockwise',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Station ramps (bins per ramp as JSON)
CREATE TABLE IF NOT EXISTS station_ramps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  station_id TEXT NOT NULL,
  ramp_number INTEGER NOT NULL,
  bins TEXT NOT NULL,
  FOREIGN KEY (station_id) REFERENCES sorpa_stations(id)
);

CREATE INDEX IF NOT EXISTS idx_ramps_station ON station_ramps(station_id);

-- User trips
CREATE TABLE IF NOT EXISTS sorpa_trips (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_hash TEXT NOT NULL,
  station_id TEXT,
  status TEXT DEFAULT 'loading',
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  FOREIGN KEY (station_id) REFERENCES sorpa_stations(id)
);

CREATE INDEX IF NOT EXISTS idx_trips_user ON sorpa_trips(user_hash);
CREATE INDEX IF NOT EXISTS idx_trips_status ON sorpa_trips(status);

-- Items in trips
CREATE TABLE IF NOT EXISTS trip_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  trip_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  home_bin TEXT NOT NULL,
  sorpa_bin TEXT NOT NULL,
  ramp_number INTEGER,
  confidence REAL,
  image_key TEXT,
  scan_mode TEXT DEFAULT 'item',
  scanned_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (trip_id) REFERENCES sorpa_trips(id)
);

CREATE INDEX IF NOT EXISTS idx_items_trip ON trip_items(trip_id);

-- Seed station data (6 capital area stations)
INSERT OR IGNORE INTO sorpa_stations (id, name, address, lat, lng, type, traffic_flow) VALUES
  ('saevarhofda', 'Sævarhöfða', 'Sævarhöfði 1, 110 Reykjavík', 64.1309565, -21.833933, 'endurvinnslustod', 'counterclockwise'),
  ('ananaust', 'Ánanaustum', 'Ánanaustum 7, 101 Reykjavík', 64.1525, -21.9314, 'endurvinnslustod', 'counterclockwise'),
  ('gufunes', 'Gufunesi', 'Gufunesvegur 9, 112 Reykjavík', 64.1442, -21.8167, 'endurvinnslustod', 'counterclockwise'),
  ('alfsnes', 'Álfsnesi', 'Álfsnes, 109 Reykjavík', 64.1833, -21.8333, 'endurvinnslustod', 'counterclockwise'),
  ('breidhella', 'Breiðhellu', 'Breiðhella 1, 200 Kópavogur', 64.1028, -21.8833, 'endurvinnslustod', 'counterclockwise'),
  ('lambhagavegur', 'Lambhagavegi', 'Lambhagavegur 14, 113 Reykjavík', 64.1389, -21.7833, 'endurvinnslustod', 'counterclockwise');

-- Seed ramp data for Sævarhöfða (example)
INSERT OR IGNORE INTO station_ramps (id, station_id, ramp_number, bins) VALUES
  ('saev_r1', 'saevarhofda', 1, '["pappi","pappir","plast_mjukt","plast_hardt","blandadur"]'),
  ('saev_r2', 'saevarhofda', 2, '["gler","malmar","textill"]'),
  ('saev_r3', 'saevarhofda', 3, '["raftaeki_smaa","raftaeki_stor","spilliefni"]');
