# CLAUDE.md

This file provides guidance to Claude Code and AI agents when working with this repository.

**Project:** rusl.myx.is — Íslensk ruslaflokkun með gervigreind  
**Owner:** 2076 ehf (omar@2076.is)  
**Repository:** github.com/omarorn/rusl.myx.is  
**Philosophy:** Design invisible systems that make daily life effortless

---

## 🎯 Project Overview

An Icelandic waste classification system with two products:
1. **PWA (trash.myx.is)** — Mobile camera-based classification
2. **TrashPi** — IoT device for physical bins

**Tech Stack:**
- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Backend:** Cloudflare Workers + Hono + D1 + R2 + KV
- **AI:** HuggingFace (primary) + Gemini (fallback)
- **IoT:** Raspberry Pi + Python + TFLite

---

## 📁 Repository Structure

```
rusl.myx.is/
├── worker/                 # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts        # Hono app entry
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── types.ts        # TypeScript types
│   ├── migrations/         # D1 SQL migrations
│   ├── wrangler.toml       # Cloudflare config
│   └── package.json
├── src/                    # PWA React frontend
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   └── services/           # API client
├── trashpi/                # Raspberry Pi code
├── CLAUDE.md               # This file
└── README.md
```

---

## 🔧 Development Commands

### Worker (Backend)

```bash
cd worker
npm install
npm run dev         # Local development (port 8787)
npm run deploy      # Deploy to Cloudflare
```

### PWA (Frontend)

```bash
npm install
npm run dev         # Local development (port 5173)
npm run build       # Production build
```

### Database

```bash
cd worker
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM scans"
npx wrangler d1 execute trash-myx-db --remote --command "SELECT * FROM users"
```

---

## ☁️ Cloudflare Resources

| Resource | Binding | ID |
|----------|---------|-----|
| D1 | `DB` | `56f8b19e-c7bb-40e1-b5f9-a47eb2d06b93` |
| R2 | `IMAGES` | `trash-myx-images` |
| KV | `CACHE` | `e5536c0571954289b4d21d9ad35918ef` |

**Secrets (wrangler secret put):**
- `HF_API_KEY` — HuggingFace Inference API
- `GEMINI_API_KEY` — Google Gemini API

---

## 🧠 AI Classification Flow

```
1. Image received (base64)
       ↓
2. HuggingFace API (watersplash/waste-classification)
   - 85.8M params, 98% accuracy
   - Returns: label + confidence score
       ↓
3. Confidence check
   - ≥80%: Use HuggingFace result
   - <80%: Fallback to Gemini
       ↓
4. Iceland Rules Engine
   - Apply hardcoded overrides
   - Map to SORPA bin system
       ↓
5. Response with bin, reason, points
```

---

## ⚠️ CRITICAL: Iceland-Specific Rules

**These overrides MUST be applied regardless of AI model output:**

```typescript
// worker/src/services/iceland-rules.ts

const ICELAND_OVERRIDES = {
  // 3D printed plastics → ALWAYS mixed waste
  'pla': 'mixed',
  'abs': 'mixed', 
  'petg': 'mixed',
  '3d printed': 'mixed',
  
  // Bioplastics → Mixed (SORPA cannot process)
  'bioplastic': 'mixed',
  'compostable plastic': 'mixed',
  
  // TetraPak → Paper (exception to multi-material rule)
  'tetrapak': 'paper',
  'milk carton': 'paper',
  
  // Foam → Recycling center only
  'styrofoam': 'recycling_center',
  'polystyrene': 'recycling_center',
};
```

**Why these matter:**
- SORPA's Molta facility cannot process PLA even though it's "biodegradable"
- Bioplastics require 50°C+ industrial composting (not available in Iceland)
- TetraPak is shipped to Sweden for special processing
- Foam plastic contaminates regular plastic recycling

---

## 🏗️ Architecture Patterns

### Parameterized Queries (D1)

```typescript
// ✅ SECURE
const result = await env.DB.prepare(
  'SELECT * FROM scans WHERE user_hash = ?'
).bind(userHash).first();

// ❌ VULNERABLE
const result = await env.DB.prepare(
  `SELECT * FROM scans WHERE user_hash = '${userHash}'`
).first();
```

### Rate Limiting (KV)

```typescript
// worker/src/routes/identify.ts
const RATE_LIMIT = 30;  // per minute
const RATE_WINDOW = 60; // seconds

async function checkRateLimit(ip: string, cache: KVNamespace): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await cache.get(key);
  if (!current) {
    await cache.put(key, '1', { expirationTtl: RATE_WINDOW });
    return true;
  }
  const count = parseInt(current, 10);
  if (count >= RATE_LIMIT) return false;
  await cache.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return true;
}
```

### Error Responses (Icelandic)

```typescript
// All user-facing errors in Icelandic
return c.json({ error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.' }, 429);
return c.json({ error: 'Mynd vantar.' }, 400);
return c.json({ error: 'Villa kom upp.' }, 500);
```

---

## 📊 Database Schema

```sql
-- scans: Each classification
CREATE TABLE scans (
  id TEXT PRIMARY KEY,
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

-- users: Gamification stats
CREATE TABLE users (
  user_hash TEXT PRIMARY KEY,
  total_scans INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_scan_date TEXT
);

-- fun_facts: Educational content
CREATE TABLE fun_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fact_is TEXT NOT NULL,
  category TEXT DEFAULT 'general'
);
```

---

## 🌐 API Contract

### POST /api/identify

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "lat": 64.1466,
  "lng": -21.9426,
  "userHash": "user_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "item": "plastflaska",
  "bin": "plastic",
  "binInfo": {
    "name_is": "Plastumbúðir",
    "color": "#16a34a",
    "icon": "🧴"
  },
  "reason": "Plastflaska fer í plastumbúðir.",
  "confidence": 0.94,
  "points": 15,
  "streak": 3,
  "funFact": "Gler má endurvinna endalaust án þess að tapa gæðum."
}
```

### GET /api/rules/:sveitarfelag

**Response:**
```json
{
  "sveitarfelag": "reykjavik",
  "name": "Reykjavík (SORPA)",
  "bins": [
    { "type": "paper", "name_is": "Pappír og pappi", "color": "#2563eb", "icon": "📄" },
    { "type": "plastic", "name_is": "Plastumbúðir", "color": "#16a34a", "icon": "🧴" },
    { "type": "food", "name_is": "Matarleifar", "color": "#92400e", "icon": "🍎" },
    { "type": "mixed", "name_is": "Blandaður úrgangur", "color": "#6b7280", "icon": "🗑️" }
  ],
  "notes": ["Málmar fara með plasti", "Gler fer á endurvinnslustöð"]
}
```

---

## 🚫 What NOT to Do

1. **Never classify PLA/3D prints as recyclable plastic**
2. **Never classify bioplastics as compostable/food waste**
3. **Never show UI elements in English** (all Icelandic)
4. **Never store raw images** (R2 only for debug, disabled by default)
5. **Never expose API keys** (use wrangler secrets)

---

## ✅ Checklist Before Deploying

- [ ] Run `npm run dev` in worker/ — test endpoints
- [ ] Run `npm run dev` in root — test PWA
- [ ] Check iceland-rules.ts has all overrides
- [ ] Verify D1 migrations applied: `--remote`
- [ ] Set secrets: `HF_API_KEY`, `GEMINI_API_KEY`
- [ ] Test rate limiting works
- [ ] Verify Icelandic error messages

---

## 🔗 Related Links

- [HuggingFace Model](https://huggingface.co/watersplash/waste-classification)
- [SORPA Flokkun](https://sorpa.is/flokkunartafla)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)

---

## 🌍 2076 ehf Context

**Company:** 2076 ehf — Icelandic tech consulting  
**Mission:** "Við leysum vandamál með tækni"  
**Owner:** Ómar Örn Magnússon (omar@2076.is)

**Related Projects:**
- myx.is — MyX portal ecosystem
- gervikaup.is — AI commerce
- eyjar.app — Demo/staging

---

**This file is the source of truth for AI agents working on rusl.myx.is.**  
**Last Updated:** January 17, 2026
