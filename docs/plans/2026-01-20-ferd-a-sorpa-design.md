# Ferð á SORPA — Design Document

**Date:** 2026-01-20
**Status:** Draft
**Author:** Omar + Claude

---

## 1. Overview

A trip planning feature that helps users scan their recycling load at home, assigns each item to the correct bin/station at SORPA, and provides a map for efficient drop-off.

### Problem Statement

Users going to SORPA recycling centers don't know:
1. Which items go to which bin/container
2. Where each bin is located at the station
3. The optimal route through the station

### Solution

"Ferð á SORPA" — a trip assistant that:
- Scans items before leaving home
- Assigns each to the correct SORPA bin
- Shows a map with optimized route through the station

---

## 2. Icelandic Recycling Ecosystem

| Destination | Purpose | Cost |
|-------------|---------|------|
| **Endurvinnslan** | Deposit bottles/cans (pantflöskur) | Get money back |
| **Grenndarstöðvar** | Neighborhood stations (glass, batteries, textiles) | Free |
| **Endurvinnslustöðvar** | Full recycling centers (6 in capital area) | Free for household; paid for construction |

### SORPA Stations (Capital Area)

1. Sævarhöfða
2. Ánanaustum
3. Gufunesi
4. Álfsnesi
5. Breiðhellu (Kópavogur)
6. Lambhagavegur (new, opening 2026)

---

## 3. Scan Modes

| Mode | Priority | Complexity | Best For |
|------|----------|------------|----------|
| **Item-by-item** | Phase 1 (MVP) | Low | Careful sorters, learning users |
| **Batch mode** | Phase 2 | Medium | Quick loading, experienced users |
| **Voice-assisted** | Phase 3 | Medium | Hands-full situations |
| **Continuous scan** | Phase 4 | High | Power users, TrashPi device |

### Mode 1: Item-by-Item (MVP)

```
Tap [+Hlut] → Camera opens → Point at item → Tap capture
     ↓
AI classifies → Shows: "Pizzakassi → Pappi (Rampur 1)"
     ↓
[Bæta við] adds to trip list → Back to trip view
```

### Mode 2: Batch Mode

```
Tap [Byrja hleðslu] → Camera continuous preview
     ↓
Walk around → Motion detected → Auto-capture (every 2-3 sec)
     ↓
Tap [Lokið] → Process all images → Show batch results
     ↓
User reviews: ✓ Keep / ✗ Remove duplicates → [Vista ferð]
```

### Mode 3: Voice-Assisted

```
Tap [🎤] → "Bæta við glerbollum"
     ↓
Speech-to-text → Match to known items → "Glerbollar → Gler (Rampur 2)"
     ↓
[Staðfesta] or correct → Added to trip
```

### Mode 4: Continuous Scan (TrashPi)

```
Camera always on → AI detects new object entering frame
     ↓
Auto-classify → Toast notification: "Pizzakassi bætt við"
     ↓
Running list updates in real-time
```

---

## 4. Data Model

### Trip Structure

```typescript
interface SorpaTrip {
  id: string;
  user_hash: string;
  status: 'loading' | 'ready' | 'in_progress' | 'completed';
  destination: string;           // Station ID
  created_at: string;
  completed_at?: string;
  items: TripItem[];
}

interface TripItem {
  id: string;
  name_is: string;               // "Pizzakassi"
  image_url?: string;            // R2 stored photo
  classification: string;        // AI result
  confidence: number;
  sorpa_bin: SorpaBinType;       // Which container at station
  ramp_number?: number;          // Which ramp
  scanned_at: string;
  scan_mode: 'item' | 'batch' | 'voice' | 'continuous';
}
```

### SORPA Bin Types

```typescript
type SorpaBin =
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
```

### Station Structure

```typescript
interface StationLayout {
  id: string;
  name: string;
  coordinates: [number, number];  // [lat, lng]
  aerial_image_url: string;
  traffic_flow: 'clockwise' | 'counterclockwise';
  ramps: Ramp[];
  open_areas: OpenArea[];
}

interface Ramp {
  number: 1 | 2 | 3;
  bins: RampBin[];
}

interface RampBin {
  position: number;
  bin_type: SorpaBin;
  label_is: string;
}
```

---

## 5. SORPA Bin Mapping Logic

### Home Bin → SORPA Bin

The current `/api/identify` returns home bins. For SORPA trips, we need granular mapping:

```typescript
function mapToSorpaBin(item: string, home_bin: HomeBin): SorpaBin {
  const itemLower = item.toLowerCase();

  // Glass
  if (itemLower.includes('gler') || itemLower.includes('flaska')) {
    return 'gler';
  }

  // Electronics
  if (itemLower.match(/sími|tölva|sjónvarp|þvotta|ísskáp/)) {
    return itemLower.match(/sími|hleðslu|mús/)
      ? 'raftaeki_smaa'
      : 'raftaeki_stor';
  }

  // Paper vs Cardboard
  if (home_bin === 'paper') {
    return itemLower.match(/kassi|pappi|umbúð/) ? 'pappi' : 'pappir';
  }

  // Plastic: soft vs hard
  if (home_bin === 'plastic') {
    return itemLower.match(/poki|filma|umbúð|mjúk/)
      ? 'plast_mjukt'
      : 'plast_hardt';
  }

  // ... more rules
}
```

### Bin Metadata

| SorpaBin | Icelandic | Icon | Typical Ramp |
|----------|-----------|------|--------------|
| `pappir` | Pappír | 📄 | 1 |
| `pappi` | Pappi og karton | 📦 | 1 |
| `plast_mjukt` | Mjúkplast | 🛍️ | 1 |
| `plast_hardt` | Harðplast | 🧴 | 1 |
| `malmar` | Málmar | 🥫 | 2 |
| `gler` | Gler og postulín | 🫙 | 2 |
| `raftaeki_smaa` | Smáraftæki | 📱 | 3 |
| `raftaeki_stor` | Stórraftæki | 🧊 | Outside |
| `spilliefni` | Spilliefni | ☠️ | 3 (staff) |
| `textill` | Textíll | 👕 | 2 |
| `gardur` | Garðaúrgangur | 🌿 | Open area |
| `byggingar` | Byggingarúrgangur | 🧱 | Open area |
| `blandadur` | Blandaður | 🗑️ | 1 |

---

## 6. Station Map & Navigation

### Sævarhöfða Layout (from aerial)

- **3 ramps** with containers along each
- **Parking area** at entrance
- **Office building** (center)
- **Open areas** for garden/construction waste
- **Counterclockwise** traffic flow

### Route Optimization

```typescript
function optimizeRoute(trip: SorpaTrip, station: StationLayout): RouteStop[] {
  // Group items by ramp
  const itemsByRamp = groupItemsByRamp(trip.items, station);

  // Order stops following traffic flow
  return station.traffic_flow === 'counterclockwise'
    ? [ramp1Items, ramp2Items, ramp3Items, openAreaItems]
    : [ramp3Items, ramp2Items, ramp1Items, openAreaItems];
}
```

### Map UI Concept

```
┌─────────────────────────────────────┐
│  🚗 Þín leið á Sævarhöfða           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │    [Aerial photo with         │  │
│  │     numbered markers:         │  │
│  │     ① Pappi (3 items)        │  │
│  │     ② Gler (1 item)          │  │
│  │     ③ Raftæki (2 items)]     │  │
│  └───────────────────────────────┘  │
│                                     │
│  Stopp 1 af 3: Rampur 1 - Pappi     │
│  • Pizzakassar (2x)                 │
│  • Skókassi                         │
│                                     │
│  [Næsta stopp →]                    │
└─────────────────────────────────────┘
```

---

## 7. Data Collection Strategy

### Data Sources

| Source | Data Type | Priority |
|--------|-----------|----------|
| Google Maps | Aerial photos | High |
| Já.is | Ramp labels (1,2,3) | High |
| SORPA website | Waste categories | High |
| LiDAR scans (iPhone) | Detailed bin positions | Medium |
| User contributions | Updates, corrections | Low |

### Phase 1: Manual Entry

Hardcode 6 capital area stations with:
- GPS coordinates
- Aerial photo URL
- Ramp count
- Basic bin→ramp mapping

### Phase 2: LiDAR Enhancement

```
Visit station with iPhone → Scan with LiDAR app
     ↓
Export USDZ/GLB → Extract bin coordinates
     ↓
Upload to R2 → Overlay on aerial photo
```

### Phase 3: Crowdsourcing

```typescript
interface UserContribution {
  station_id: string;
  user_hash: string;
  type: 'photo' | 'correction' | 'new_bin';
  data: { ... };
  status: 'pending' | 'approved' | 'rejected';
}
```

---

## 8. Implementation Phases

| Phase | Features | Effort |
|-------|----------|--------|
| **Phase 1** | Item-by-item scan, trip list, basic bin mapping | 2-3 days |
| **Phase 2** | Station maps (aerial + ramps), route display | 2-3 days |
| **Phase 3** | Batch mode (motion capture), trip history | 3-4 days |
| **Phase 4** | Voice input, Grenndarstöðvar support | 2-3 days |
| **Phase 5** | LiDAR integration, AR navigation | 5+ days |

---

## 9. Phase 1 Deliverables (MVP)

### Backend API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/trips` | Create new trip |
| GET | `/api/trips/:id` | Get trip with items |
| POST | `/api/trips/:id/items` | Add item to trip |
| PUT | `/api/trips/:id/complete` | Mark done, award points |
| GET | `/api/stations` | List SORPA stations |
| GET | `/api/stations/:id` | Station details + layout |

### Database Tables

```sql
CREATE TABLE sorpa_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  type TEXT DEFAULT 'endurvinnslustod',
  opening_hours TEXT,
  aerial_image_url TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE station_ramps (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES sorpa_stations(id),
  ramp_number INTEGER NOT NULL,
  bins TEXT NOT NULL  -- JSON array
);

CREATE TABLE sorpa_trips (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  station_id TEXT REFERENCES sorpa_stations(id),
  status TEXT DEFAULT 'loading',
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE TABLE trip_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES sorpa_trips(id),
  item_name TEXT NOT NULL,
  home_bin TEXT NOT NULL,
  sorpa_bin TEXT NOT NULL,
  ramp_number INTEGER,
  confidence REAL,
  image_key TEXT,
  scan_mode TEXT DEFAULT 'item',
  scanned_at INTEGER DEFAULT (unixepoch())
);
```

### Frontend Components

| Component | Purpose |
|-----------|---------|
| TripScreen.tsx | Main trip view |
| TripScanner.tsx | Item-by-item camera |
| TripSummary.tsx | Items grouped by bin |
| StationPicker.tsx | Choose destination |
| StationMap.tsx | Aerial view + markers |

---

## 10. Open Questions

1. **Grenndarstöðvar data** — How to get bin types for 57 neighborhood stations?
2. **Real-time updates** — How to handle bin changes/maintenance at stations?
3. **Offline support** — Should trips work offline?
4. **Cost estimation** — How to calculate fees for construction waste?

---

## 11. Success Metrics

- Users complete trips with correct bin assignments
- Reduced time at SORPA (optimized routes)
- User satisfaction (ratings, return usage)
- Data accuracy (crowdsourced corrections < 5%)

---

**Next Steps:**
1. Create database migrations
2. Implement Phase 1 API endpoints
3. Build MVP frontend components
4. Seed station data (6 endurvinnslustöðvar)
5. Test with real trips to Sævarhöfða
