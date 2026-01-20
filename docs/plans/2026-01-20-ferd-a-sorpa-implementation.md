# Ferð á SORPA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Phase 1 MVP of SORPA trip planning — scan items, assign to bins, show station map.

**Architecture:** New routes `/api/trips` and `/api/stations` following existing Hono patterns. Database tables for trips, items, stations. Frontend TripScreen component with scanner integration.

**Tech Stack:** Hono routes, D1 database, React components, existing classify service.

---

## Task 1: Database Migration — SORPA Tables

**Files:**
- Create: `worker/migrations/0005_sorpa_trips.sql`

**Step 1: Write the migration file**

```sql
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
```

**Step 2: Apply migration locally**

Run: `cd worker && npx wrangler d1 execute trash-myx-db --local --file=./migrations/0005_sorpa_trips.sql`

Expected: Success with no errors

**Step 3: Verify tables created**

Run: `cd worker && npx wrangler d1 execute trash-myx-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sorpa%' OR name LIKE 'station%' OR name LIKE 'trip%'"`

Expected: Shows `sorpa_stations`, `station_ramps`, `sorpa_trips`, `trip_items`

**Step 4: Commit**

```bash
cd /c/git/rusl.myx.is/.worktrees/ferd-a-sorpa
git add worker/migrations/0005_sorpa_trips.sql
git commit -m "feat(db): add SORPA trips tables and seed station data"
```

---

## Task 2: TypeScript Types — SORPA Models

**Files:**
- Modify: `worker/src/types.ts`

**Step 1: Add SORPA types to types.ts**

Add after line 130 (after `ScanRecord` interface):

```typescript
// SORPA Bin Types (more granular than home bins)
export type SorpaBinType =
  | 'pappir'        // Paper (books, magazines)
  | 'pappi'         // Cardboard (boxes)
  | 'plast_mjukt'   // Soft plastic (film, bags)
  | 'plast_hardt'   // Hard plastic (containers)
  | 'malmar'        // Metals
  | 'gler'          // Glass
  | 'raftaeki_smaa' // Small electronics
  | 'raftaeki_stor' // Large electronics
  | 'spilliefni'    // Hazardous
  | 'textill'       // Textiles
  | 'gardur'        // Garden waste
  | 'byggingar'     // Construction
  | 'blandadur';    // Mixed (last resort)

// SORPA Station
export interface SorpaStation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: 'endurvinnslustod' | 'grenndarstod';
  opening_hours: string | null;
  aerial_image_url: string | null;
  traffic_flow: 'clockwise' | 'counterclockwise';
  created_at: number;
}

// Station Ramp
export interface StationRamp {
  id: string;
  station_id: string;
  ramp_number: number;
  bins: SorpaBinType[];  // Parsed from JSON
}

// Trip status
export type TripStatus = 'loading' | 'ready' | 'in_progress' | 'completed';

// SORPA Trip
export interface SorpaTrip {
  id: string;
  user_hash: string;
  station_id: string | null;
  status: TripStatus;
  created_at: number;
  completed_at: number | null;
}

// Trip Item
export interface TripItem {
  id: string;
  trip_id: string;
  item_name: string;
  home_bin: BinType;
  sorpa_bin: SorpaBinType;
  ramp_number: number | null;
  confidence: number | null;
  image_key: string | null;
  scan_mode: 'item' | 'batch' | 'voice' | 'continuous';
  scanned_at: number;
}

// SORPA Bin Metadata
export interface SorpaBinInfo {
  type: SorpaBinType;
  name_is: string;
  icon: string;
  typical_ramp: number | null;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add worker/src/types.ts
git commit -m "feat(types): add SORPA trip and station types"
```

---

## Task 3: SORPA Mapping Service

**Files:**
- Create: `worker/src/services/sorpa-mapping.ts`

**Step 1: Create the mapping service**

```typescript
// worker/src/services/sorpa-mapping.ts
import type { BinType, SorpaBinType, SorpaBinInfo } from '../types';

// SORPA bin metadata
export const SORPA_BINS: Record<SorpaBinType, SorpaBinInfo> = {
  pappir: { type: 'pappir', name_is: 'Pappír', icon: '📄', typical_ramp: 1 },
  pappi: { type: 'pappi', name_is: 'Pappi og karton', icon: '📦', typical_ramp: 1 },
  plast_mjukt: { type: 'plast_mjukt', name_is: 'Mjúkplast', icon: '🛍️', typical_ramp: 1 },
  plast_hardt: { type: 'plast_hardt', name_is: 'Harðplast', icon: '🧴', typical_ramp: 1 },
  malmar: { type: 'malmar', name_is: 'Málmar', icon: '🥫', typical_ramp: 2 },
  gler: { type: 'gler', name_is: 'Gler og postulín', icon: '🫙', typical_ramp: 2 },
  raftaeki_smaa: { type: 'raftaeki_smaa', name_is: 'Smáraftæki', icon: '📱', typical_ramp: 3 },
  raftaeki_stor: { type: 'raftaeki_stor', name_is: 'Stórraftæki', icon: '🧊', typical_ramp: null },
  spilliefni: { type: 'spilliefni', name_is: 'Spilliefni', icon: '☠️', typical_ramp: 3 },
  textill: { type: 'textill', name_is: 'Textíll', icon: '👕', typical_ramp: 2 },
  gardur: { type: 'gardur', name_is: 'Garðaúrgangur', icon: '🌿', typical_ramp: null },
  byggingar: { type: 'byggingar', name_is: 'Byggingarúrgangur', icon: '🧱', typical_ramp: null },
  blandadur: { type: 'blandadur', name_is: 'Blandaður', icon: '🗑️', typical_ramp: 1 },
};

/**
 * Map a classified item to a SORPA bin
 * @param item - Item name (Icelandic)
 * @param homeBin - Home bin classification
 * @returns SORPA bin type
 */
export function mapToSorpaBin(item: string, homeBin: BinType): SorpaBinType {
  const itemLower = item.toLowerCase();

  // Glass detection
  if (homeBin === 'recycling_center') {
    if (itemLower.match(/gler|flaska|krukka|postulín|keramik/)) {
      return 'gler';
    }
    if (itemLower.match(/rafhlöð|batterí/)) {
      return 'spilliefni';
    }
    if (itemLower.match(/föt|klæði|skór|teppi/)) {
      return 'textill';
    }
  }

  // Electronics detection
  if (itemLower.match(/sími|símahleðslu|tölva|tablet|ipad|mús|lyklaborð|heyrnartól/)) {
    return 'raftaeki_smaa';
  }
  if (itemLower.match(/sjónvarp|þvottavél|þurrkari|ísskáp|ofn|eldavél/)) {
    return 'raftaeki_stor';
  }

  // Paper vs Cardboard distinction
  if (homeBin === 'paper') {
    if (itemLower.match(/kassi|pappi|umbúð|kassa|box/)) {
      return 'pappi';
    }
    return 'pappir';
  }

  // Plastic: soft vs hard
  if (homeBin === 'plastic') {
    if (itemLower.match(/poki|poka|filma|umbúða|mjúk|plastpoki/)) {
      return 'plast_mjukt';
    }
    if (itemLower.match(/dós|ál|málm|tin|can/)) {
      return 'malmar';
    }
    return 'plast_hardt';
  }

  // Food waste → Garden at SORPA
  if (homeBin === 'food') {
    return 'gardur';
  }

  // Hazardous materials
  if (itemLower.match(/málning|olía|lyf|efna|bensín|þynni|rafhlöð/)) {
    return 'spilliefni';
  }

  // Textiles
  if (itemLower.match(/föt|klæði|skór|teppi|tjald|koddi|sæng/)) {
    return 'textill';
  }

  // Construction
  if (itemLower.match(/viður|planki|gips|flís|steinefni|málm|pípa/)) {
    return 'byggingar';
  }

  // Default: mixed
  return 'blandadur';
}

/**
 * Get bin info for display
 */
export function getSorpaBinInfo(binType: SorpaBinType): SorpaBinInfo {
  return SORPA_BINS[binType] || SORPA_BINS.blandadur;
}

/**
 * Group items by ramp number for route optimization
 */
export function groupItemsByRamp(items: Array<{ sorpa_bin: SorpaBinType }>): Map<number | null, typeof items> {
  const groups = new Map<number | null, typeof items>();

  for (const item of items) {
    const ramp = SORPA_BINS[item.sorpa_bin]?.typical_ramp ?? null;
    if (!groups.has(ramp)) {
      groups.set(ramp, []);
    }
    groups.get(ramp)!.push(item);
  }

  return groups;
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

Expected: No errors

**Step 3: Commit**

```bash
git add worker/src/services/sorpa-mapping.ts
git commit -m "feat(service): add SORPA bin mapping logic"
```

---

## Task 4: Stations API Route

**Files:**
- Create: `worker/src/routes/stations.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create stations route**

```typescript
// worker/src/routes/stations.ts
import { Hono } from 'hono';
import type { Env, SorpaStation, StationRamp } from '../types';

const stations = new Hono<{ Bindings: Env }>();

// GET /api/stations - List all stations
stations.get('/', async (c) => {
  const type = c.req.query('type'); // Optional filter

  let query = 'SELECT * FROM sorpa_stations';
  const params: string[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY name';

  const result = params.length > 0
    ? await c.env.DB.prepare(query).bind(...params).all<SorpaStation>()
    : await c.env.DB.prepare(query).all<SorpaStation>();

  return c.json({
    stations: result.results || [],
    count: result.results?.length || 0,
  });
});

// GET /api/stations/:id - Get station details with ramps
stations.get('/:id', async (c) => {
  const id = c.req.param('id');

  // Get station
  const station = await c.env.DB.prepare(
    'SELECT * FROM sorpa_stations WHERE id = ?'
  ).bind(id).first<SorpaStation>();

  if (!station) {
    return c.json({ error: 'Stöð finnst ekki' }, 404);
  }

  // Get ramps
  const rampsResult = await c.env.DB.prepare(
    'SELECT * FROM station_ramps WHERE station_id = ? ORDER BY ramp_number'
  ).bind(id).all<StationRamp & { bins: string }>();

  // Parse bins JSON
  const ramps = (rampsResult.results || []).map(ramp => ({
    ...ramp,
    bins: JSON.parse(ramp.bins),
  }));

  return c.json({
    station,
    ramps,
  });
});

export default stations;
```

**Step 2: Mount route in index.ts**

Add import after line 11:
```typescript
import stations from './routes/stations';
```

Add route after line 66 (after admin route):
```typescript
app.route('/api/stations', stations);
```

Add to endpoints list in health check (around line 45):
```typescript
'GET /api/stations',
'GET /api/stations/:id',
```

**Step 3: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

Expected: No errors

**Step 4: Test locally**

Run: `cd worker && npm run dev`

In another terminal:
```bash
curl http://localhost:8787/api/stations
curl http://localhost:8787/api/stations/saevarhofda
```

Expected: JSON responses with station data

**Step 5: Commit**

```bash
git add worker/src/routes/stations.ts worker/src/index.ts
git commit -m "feat(api): add /api/stations endpoint"
```

---

## Task 5: Trips API Route — Create & Get

**Files:**
- Create: `worker/src/routes/trips.ts`
- Modify: `worker/src/index.ts`

**Step 1: Create trips route (part 1)**

```typescript
// worker/src/routes/trips.ts
import { Hono } from 'hono';
import type { Env, SorpaTrip, TripItem, TripStatus } from '../types';

const trips = new Hono<{ Bindings: Env }>();

// POST /api/trips - Create new trip
trips.post('/', async (c) => {
  const body = await c.req.json<{ userHash: string; stationId?: string }>();

  if (!body.userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  // Check for existing loading trip
  const existing = await c.env.DB.prepare(
    'SELECT id FROM sorpa_trips WHERE user_hash = ? AND status = ?'
  ).bind(body.userHash, 'loading').first();

  if (existing) {
    return c.json({ error: 'Ferð í vinnslu þegar til', tripId: existing.id }, 409);
  }

  // Create new trip
  const result = await c.env.DB.prepare(`
    INSERT INTO sorpa_trips (user_hash, station_id, status)
    VALUES (?, ?, 'loading')
    RETURNING *
  `).bind(body.userHash, body.stationId || null).first<SorpaTrip>();

  return c.json({ trip: result }, 201);
});

// GET /api/trips/:id - Get trip with items
trips.get('/:id', async (c) => {
  const id = c.req.param('id');

  const trip = await c.env.DB.prepare(
    'SELECT * FROM sorpa_trips WHERE id = ?'
  ).bind(id).first<SorpaTrip>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  const itemsResult = await c.env.DB.prepare(
    'SELECT * FROM trip_items WHERE trip_id = ? ORDER BY scanned_at'
  ).bind(id).all<TripItem>();

  return c.json({
    trip,
    items: itemsResult.results || [],
    itemCount: itemsResult.results?.length || 0,
  });
});

// GET /api/trips - Get user's trips
trips.get('/', async (c) => {
  const userHash = c.req.query('userHash');
  const status = c.req.query('status') as TripStatus | undefined;

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  let query = 'SELECT * FROM sorpa_trips WHERE user_hash = ?';
  const params: (string | TripStatus)[] = [userHash];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT 20';

  const result = await c.env.DB.prepare(query).bind(...params).all<SorpaTrip>();

  return c.json({
    trips: result.results || [],
    count: result.results?.length || 0,
  });
});

export default trips;
```

**Step 2: Mount route in index.ts**

Add import:
```typescript
import trips from './routes/trips';
```

Add route:
```typescript
app.route('/api/trips', trips);
```

Add to endpoints list:
```typescript
'POST /api/trips',
'GET /api/trips',
'GET /api/trips/:id',
```

**Step 3: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

Expected: No errors

**Step 4: Commit**

```bash
git add worker/src/routes/trips.ts worker/src/index.ts
git commit -m "feat(api): add /api/trips create and get endpoints"
```

---

## Task 6: Trips API — Add Items & Complete

**Files:**
- Modify: `worker/src/routes/trips.ts`

**Step 1: Add item endpoint**

Add after the GET routes in trips.ts:

```typescript
import { mapToSorpaBin, getSorpaBinInfo, SORPA_BINS } from '../services/sorpa-mapping';
import type { BinType } from '../types';

// POST /api/trips/:id/items - Add item to trip
trips.post('/:id/items', async (c) => {
  const tripId = c.req.param('id');
  const body = await c.req.json<{
    itemName: string;
    homeBin: BinType;
    confidence?: number;
    imageKey?: string;
    scanMode?: 'item' | 'batch' | 'voice' | 'continuous';
  }>();

  if (!body.itemName || !body.homeBin) {
    return c.json({ error: 'itemName og homeBin vantar' }, 400);
  }

  // Verify trip exists and is in loading state
  const trip = await c.env.DB.prepare(
    'SELECT id, status FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<{ id: string; status: string }>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status !== 'loading') {
    return c.json({ error: 'Ferð er ekki í hleðslu' }, 400);
  }

  // Map to SORPA bin
  const sorpaBin = mapToSorpaBin(body.itemName, body.homeBin);
  const binInfo = getSorpaBinInfo(sorpaBin);

  // Insert item
  const result = await c.env.DB.prepare(`
    INSERT INTO trip_items (trip_id, item_name, home_bin, sorpa_bin, ramp_number, confidence, image_key, scan_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    tripId,
    body.itemName,
    body.homeBin,
    sorpaBin,
    binInfo.typical_ramp,
    body.confidence || null,
    body.imageKey || null,
    body.scanMode || 'item'
  ).first<TripItem>();

  return c.json({
    item: result,
    sorpaBinInfo: binInfo,
  }, 201);
});

// PUT /api/trips/:id/complete - Mark trip as completed
trips.put('/:id/complete', async (c) => {
  const tripId = c.req.param('id');

  const trip = await c.env.DB.prepare(
    'SELECT * FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<SorpaTrip>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status === 'completed') {
    return c.json({ error: 'Ferð er þegar lokið' }, 400);
  }

  // Count items
  const itemCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM trip_items WHERE trip_id = ?'
  ).bind(tripId).first<{ count: number }>();

  // Update trip status
  await c.env.DB.prepare(`
    UPDATE sorpa_trips
    SET status = 'completed', completed_at = unixepoch()
    WHERE id = ?
  `).bind(tripId).run();

  // Award points (10 points per item)
  const points = (itemCount?.count || 0) * 10;

  if (trip.user_hash && points > 0) {
    await c.env.DB.prepare(`
      INSERT INTO users (user_hash, total_scans, total_points)
      VALUES (?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        total_points = total_points + excluded.total_points
    `).bind(trip.user_hash, 0, points).run();
  }

  return c.json({
    success: true,
    tripId,
    itemCount: itemCount?.count || 0,
    pointsAwarded: points,
  });
});

// DELETE /api/trips/:id/items/:itemId - Remove item from trip
trips.delete('/:id/items/:itemId', async (c) => {
  const tripId = c.req.param('id');
  const itemId = c.req.param('itemId');

  // Verify trip is in loading state
  const trip = await c.env.DB.prepare(
    'SELECT status FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<{ status: string }>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status !== 'loading') {
    return c.json({ error: 'Ferð er ekki í hleðslu' }, 400);
  }

  const result = await c.env.DB.prepare(
    'DELETE FROM trip_items WHERE id = ? AND trip_id = ?'
  ).bind(itemId, tripId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Hlutur finnst ekki' }, 404);
  }

  return c.json({ success: true });
});
```

**Step 2: Update imports at top of file**

Make sure imports are correct:
```typescript
import { Hono } from 'hono';
import type { Env, SorpaTrip, TripItem, TripStatus, BinType } from '../types';
import { mapToSorpaBin, getSorpaBinInfo } from '../services/sorpa-mapping';
```

**Step 3: Add endpoints to index.ts**

Add to endpoints list:
```typescript
'POST /api/trips/:id/items',
'PUT /api/trips/:id/complete',
'DELETE /api/trips/:id/items/:itemId',
```

**Step 4: Verify TypeScript compiles**

Run: `cd worker && npx tsc --noEmit`

Expected: No errors

**Step 5: Commit**

```bash
git add worker/src/routes/trips.ts worker/src/index.ts
git commit -m "feat(api): add trip items and complete endpoints"
```

---

## Task 7: Frontend — Trip Types & API Client

**Files:**
- Create: `src/types/trip.ts`
- Modify: `src/services/api.ts`

**Step 1: Create trip types**

```typescript
// src/types/trip.ts
export type SorpaBinType =
  | 'pappir' | 'pappi' | 'plast_mjukt' | 'plast_hardt'
  | 'malmar' | 'gler' | 'raftaeki_smaa' | 'raftaeki_stor'
  | 'spilliefni' | 'textill' | 'gardur' | 'byggingar' | 'blandadur';

export type TripStatus = 'loading' | 'ready' | 'in_progress' | 'completed';

export interface SorpaStation {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: string;
  traffic_flow: string;
}

export interface StationRamp {
  id: string;
  station_id: string;
  ramp_number: number;
  bins: SorpaBinType[];
}

export interface SorpaTrip {
  id: string;
  user_hash: string;
  station_id: string | null;
  status: TripStatus;
  created_at: number;
  completed_at: number | null;
}

export interface TripItem {
  id: string;
  trip_id: string;
  item_name: string;
  home_bin: string;
  sorpa_bin: SorpaBinType;
  ramp_number: number | null;
  confidence: number | null;
  scan_mode: string;
  scanned_at: number;
}

export interface SorpaBinInfo {
  type: SorpaBinType;
  name_is: string;
  icon: string;
  typical_ramp: number | null;
}
```

**Step 2: Add trip API functions**

Add to `src/services/api.ts` (or create if needed):

```typescript
import type { SorpaStation, StationRamp, SorpaTrip, TripItem, SorpaBinInfo } from '../types/trip';

const API_BASE = import.meta.env.VITE_API_URL || 'https://trash.myx.is';

// Stations API
export async function getStations(): Promise<{ stations: SorpaStation[] }> {
  const res = await fetch(`${API_BASE}/api/stations`);
  return res.json();
}

export async function getStation(id: string): Promise<{ station: SorpaStation; ramps: StationRamp[] }> {
  const res = await fetch(`${API_BASE}/api/stations/${id}`);
  return res.json();
}

// Trips API
export async function createTrip(userHash: string, stationId?: string): Promise<{ trip: SorpaTrip }> {
  const res = await fetch(`${API_BASE}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash, stationId }),
  });
  return res.json();
}

export async function getTrip(id: string): Promise<{ trip: SorpaTrip; items: TripItem[] }> {
  const res = await fetch(`${API_BASE}/api/trips/${id}`);
  return res.json();
}

export async function getUserTrips(userHash: string, status?: string): Promise<{ trips: SorpaTrip[] }> {
  const params = new URLSearchParams({ userHash });
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/api/trips?${params}`);
  return res.json();
}

export async function addTripItem(
  tripId: string,
  item: { itemName: string; homeBin: string; confidence?: number }
): Promise<{ item: TripItem; sorpaBinInfo: SorpaBinInfo }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function completeTrip(tripId: string): Promise<{ success: boolean; pointsAwarded: number }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/complete`, {
    method: 'PUT',
  });
  return res.json();
}

export async function removeTripItem(tripId: string, itemId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/items/${itemId}`, {
    method: 'DELETE',
  });
  return res.json();
}
```

**Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/types/trip.ts src/services/api.ts
git commit -m "feat(frontend): add trip types and API client"
```

---

## Task 8: Frontend — TripScreen Component

**Files:**
- Create: `src/components/TripScreen.tsx`

**Step 1: Create TripScreen component**

```tsx
// src/components/TripScreen.tsx
import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from '../hooks/useTranslation';
import type { SorpaTrip, TripItem, SorpaStation } from '../types/trip';
import { createTrip, getTrip, getStations, addTripItem, completeTrip, removeTripItem } from '../services/api';

// SORPA bin info for display
const SORPA_BIN_INFO: Record<string, { name: string; icon: string }> = {
  pappir: { name: 'Pappír', icon: '📄' },
  pappi: { name: 'Pappi', icon: '📦' },
  plast_mjukt: { name: 'Mjúkplast', icon: '🛍️' },
  plast_hardt: { name: 'Harðplast', icon: '🧴' },
  malmar: { name: 'Málmar', icon: '🥫' },
  gler: { name: 'Gler', icon: '🫙' },
  raftaeki_smaa: { name: 'Smáraftæki', icon: '📱' },
  raftaeki_stor: { name: 'Stórraftæki', icon: '🧊' },
  spilliefni: { name: 'Spilliefni', icon: '☠️' },
  textill: { name: 'Textíll', icon: '👕' },
  gardur: { name: 'Garðaúrgangur', icon: '🌿' },
  byggingar: { name: 'Byggingarúrgangur', icon: '🧱' },
  blandadur: { name: 'Blandaður', icon: '🗑️' },
};

interface TripScreenProps {
  onScanItem: () => void;  // Callback to open scanner
  lastScannedItem?: { item: string; bin: string; confidence: number };
}

export function TripScreen({ onScanItem, lastScannedItem }: TripScreenProps) {
  const { userHash } = useSettings();
  const { t } = useTranslation();

  const [trip, setTrip] = useState<SorpaTrip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [stations, setStations] = useState<SorpaStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stations on mount
  useEffect(() => {
    getStations().then(data => setStations(data.stations));
  }, []);

  // Add last scanned item to trip
  useEffect(() => {
    if (lastScannedItem && trip?.status === 'loading') {
      handleAddItem(lastScannedItem);
    }
  }, [lastScannedItem]);

  const handleStartTrip = async () => {
    if (!userHash) return;
    setLoading(true);
    setError(null);

    try {
      const { trip: newTrip } = await createTrip(userHash, selectedStation || undefined);
      setTrip(newTrip);
      setItems([]);
    } catch (err) {
      setError('Villa við að búa til ferð');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (scannedItem: { item: string; bin: string; confidence: number }) => {
    if (!trip) return;

    try {
      const { item } = await addTripItem(trip.id, {
        itemName: scannedItem.item,
        homeBin: scannedItem.bin,
        confidence: scannedItem.confidence,
      });
      setItems(prev => [...prev, item]);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!trip) return;

    try {
      await removeTripItem(trip.id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const handleComplete = async () => {
    if (!trip) return;
    setLoading(true);

    try {
      const result = await completeTrip(trip.id);
      setTrip(prev => prev ? { ...prev, status: 'completed' } : null);
      alert(`Ferð lokið! +${result.pointsAwarded} stig`);
    } catch (err) {
      setError('Villa við að ljúka ferð');
    } finally {
      setLoading(false);
    }
  };

  // Group items by ramp
  const itemsByRamp = items.reduce((acc, item) => {
    const ramp = item.ramp_number ?? 0;
    if (!acc[ramp]) acc[ramp] = [];
    acc[ramp].push(item);
    return acc;
  }, {} as Record<number, TripItem[]>);

  if (!trip) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Ferð á SORPA</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Veldu stöð</label>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Velja síðar...</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStartTrip}
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
        >
          {loading ? 'Hleður...' : 'Hefja ferð'}
        </button>

        {error && <p className="text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {trip.status === 'completed' ? 'Ferð lokið' : 'Ferð í vinnslu'}
        </h2>
        <span className="text-sm text-gray-500">{items.length} hlutir</span>
      </div>

      {trip.status === 'loading' && (
        <button
          onClick={onScanItem}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <span>📷</span> Skanna hlut
        </button>
      )}

      {/* Items grouped by ramp */}
      <div className="space-y-4">
        {Object.entries(itemsByRamp)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([ramp, rampItems]) => (
            <div key={ramp} className="border rounded-lg p-3">
              <h3 className="font-medium mb-2">
                {Number(ramp) === 0 ? 'Opið svæði' : `Rampur ${ramp}`}
              </h3>
              <ul className="space-y-2">
                {rampItems.map(item => {
                  const binInfo = SORPA_BIN_INFO[item.sorpa_bin] || { name: item.sorpa_bin, icon: '❓' };
                  return (
                    <li key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <span>{binInfo.icon}</span>
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-gray-500">{binInfo.name}</p>
                        </div>
                      </div>
                      {trip.status === 'loading' && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 text-sm"
                        >
                          Fjarlægja
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>

      {trip.status === 'loading' && items.length > 0 && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
        >
          {loading ? 'Hleður...' : 'Ljúka ferð'}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/TripScreen.tsx
git commit -m "feat(ui): add TripScreen component for SORPA trips"
```

---

## Task 9: Integration — Add Trip Tab to App

**Files:**
- Modify: `src/App.tsx` (or main navigation component)

**Step 1: Add Trip tab/route**

This step depends on current app structure. Add TripScreen to navigation:

```tsx
import { TripScreen } from './components/TripScreen';

// In your tab/route configuration, add:
{
  path: '/trip',
  label: 'Ferð',
  icon: '🚗',
  component: TripScreen
}
```

**Step 2: Test full flow**

1. Start worker: `cd worker && npm run dev`
2. Start PWA: `npm run dev`
3. Navigate to Trip tab
4. Create trip, scan items, complete

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: integrate TripScreen into app navigation"
```

---

## Task 10: Deploy & Test

**Step 1: Apply remote migration**

```bash
cd worker
npx wrangler d1 execute trash-myx-db --remote --file=./migrations/0005_sorpa_trips.sql
```

**Step 2: Deploy worker**

```bash
cd worker
npm run deploy
```

**Step 3: Build and deploy PWA**

```bash
npm run build
# Deploy to your hosting (Cloudflare Pages, Vercel, etc.)
```

**Step 4: Test production**

- Create trip at trash.myx.is
- Scan items
- Complete trip
- Verify points awarded

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | `migrations/0005_sorpa_trips.sql` | Database tables + seed data |
| 2 | `types.ts` | TypeScript types |
| 3 | `services/sorpa-mapping.ts` | Bin mapping logic |
| 4 | `routes/stations.ts` | Stations API |
| 5 | `routes/trips.ts` (part 1) | Create/Get trips |
| 6 | `routes/trips.ts` (part 2) | Add items, complete |
| 7 | `src/types/trip.ts`, `api.ts` | Frontend types + API |
| 8 | `src/components/TripScreen.tsx` | Trip UI component |
| 9 | `App.tsx` | Navigation integration |
| 10 | Deploy | Production deployment |

**Estimated total time:** 2-3 hours
