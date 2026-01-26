# CLAUDE.md

This file provides guidance to Claude Code and AI agents when working with this repository.

**Project:** rusl.myx.is — Íslensk ruslaflokkun með gervigreind
**Owner:** 2076 ehf (omar@2076.is)
**Repository:** github.com/omarorn/rusl.myx.is
**Version:** 1.3.0
**Philosophy:** Design invisible systems that make daily life effortless

**Domains:**
- `rusl.myx.is` — Icelandic default (íslenska)
- `trash.myx.is` — English default

---

## 🎯 Project Overview

An Icelandic waste classification system with two products:
1. **PWA (trash.myx.is)** — Mobile camera-based classification
2. **TrashPi** — IoT device for physical bins (future)

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite PWA
- **Backend:** Cloudflare Workers + Hono + D1 + R2 + KV
- **AI:** Cloudflare AI (primary) + Gemini (fallback)
- **IoT:** Raspberry Pi + Python + TFLite (future)

---

## 📁 Repository Structure

```
rusl.myx.is/
├── .claude/                 # Claude Code configuration
│   ├── Agents/              # Custom agent prompts (icelandic-reviewer)
│   ├── commands/            # Slash commands
│   ├── rules/               # Coding rules
│   ├── skills/              # Skills (icelandic-grammar, deploy-all)
│   └── settings.json        # Plugin settings
├── .mcp.json                # MCP servers (icelandic-morphology for BÍN)
├── dist/                    # PWA build output
├── public/                  # Static assets (icons, images)
├── src/                     # Frontend React source
│   ├── components/          # React components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom hooks
│   ├── locales/             # Translations
│   └── services/            # API client
├── worker/                  # Backend Cloudflare Worker
│   ├── src/
│   │   ├── __tests__/       # Unit tests (Vitest)
│   │   ├── data/            # Static data (regions)
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   └── types.ts         # TypeScript types
│   ├── migrations/          # D1 SQL migrations
│   └── vitest.config.ts     # Test configuration
├── trashpi/                 # Raspberry Pi code (IoT)
├── scripts/                 # Utility scripts
├── CLAUDE.md                # This file
├── README.md                # Documentation (Icelandic)
├── README.en.md             # Documentation (English)
├── TODO.md                  # Task tracking
└── PLAN.md                  # Project roadmap
```

---

## 🔧 Development Commands

### Frontend (React PWA)
```bash
npm install
npm run dev              # Start dev server (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Backend (Cloudflare Worker)
```bash
cd worker
npm install
npm run dev              # Start local dev (port 8787)
npm run deploy           # Deploy to Cloudflare
```

### Database (D1)
```bash
cd worker
# Local queries
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM scans LIMIT 10"
# Remote queries
npx wrangler d1 execute trash-myx-db --remote --command "SELECT COUNT(*) FROM users"
# Apply migrations
npx wrangler d1 migrations apply trash-myx-db --local
npx wrangler d1 migrations apply trash-myx-db --remote
```

### Testing (Backend)
```bash
cd worker
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
```

**Test Coverage:**
- `iceland-rules.ts` — 28 tests covering bin mapping, overrides, and Iceland-specific rules
- Uses Vitest with Node environment

---

## ☁️ Cloudflare Resources

| Resource | Binding | ID |
|----------|---------|-----|
| D1 | `DB` | `56f8b19e-c7bb-40e1-b5f9-a47eb2d06b93` |
| R2 | `IMAGES` | `trash-myx-images` |
| KV | `CACHE` | `e5536c0571954289b4d21d9ad35918ef` |

**Secrets (set via `wrangler secret put`):**
- `GEMINI_API_KEY` — Google Gemini API (fallback classifier)
- `ADMIN_PASSWORD` — Admin panel access

---

## 🧠 AI Classification Flow

```
1. Image received (base64)
       ↓
2. Cloudflare AI (llava-1.5-7b-hf)
   - Returns: item description + confidence
       ↓
3. Confidence check
   - ≥70%: Use Cloudflare AI result
   - <70%: Fallback to Gemini
       ↓
4. Iceland Rules Engine
   - Apply hardcoded overrides (PLA, bioplast, TetraPak)
   - Map to SORPA bin system
       ↓
5. Response with bin, reason, points, fun fact
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
  'biodegradable': 'mixed',
  
  // TetraPak → Paper (exception to multi-material rule)
  'tetrapak': 'paper',
  'milk carton': 'paper',
  'juice carton': 'paper',
  
  // Foam → Recycling center only
  'styrofoam': 'recycling_center',
  'polystyrene': 'recycling_center',
  'foam': 'recycling_center',
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

// ❌ VULNERABLE - NEVER DO THIS
const result = await env.DB.prepare(
  `SELECT * FROM scans WHERE user_hash = '${userHash}'`
).first();
```

### Rate Limiting (KV)
```typescript
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
// All user-facing errors MUST be in Icelandic
return c.json({ error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.' }, 429);
return c.json({ error: 'Mynd vantar.' }, 400);
return c.json({ error: 'Villa kom upp.' }, 500);
return c.json({ error: 'Aðgangur bannaður.' }, 403);
```

---

## 📊 Database Schema

### Core Tables
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

### Quiz Tables
```sql
-- quiz_images: Images for quiz game
CREATE TABLE quiz_images (
  id TEXT PRIMARY KEY,
  image_key TEXT NOT NULL,
  correct_bin TEXT NOT NULL,
  item_name TEXT,
  difficulty INTEGER DEFAULT 1,
  approved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

-- quiz_scores: Quiz leaderboard
CREATE TABLE quiz_scores (
  id TEXT PRIMARY KEY,
  user_hash TEXT NOT NULL,
  score INTEGER NOT NULL,
  mode TEXT DEFAULT 'normal',
  created_at INTEGER DEFAULT (unixepoch())
);
```

### Ad System Tables
```sql
-- sponsors: Advertising sponsors
CREATE TABLE sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  active INTEGER DEFAULT 1
);

-- ad_clicks: Click tracking
CREATE TABLE ad_clicks (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL,
  user_hash TEXT,
  clicked_at INTEGER DEFAULT (unixepoch())
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
  "funFact": "Gler má endurvinna endalaust án þess að tapa gæðum.",
  "joke": "Af hverju fór plastflaskan til sálfræðings? Hún þurfti að endurskapa sig!"
}
```

### GET /api/quiz/random

**Response:**
```json
{
  "id": "quiz_123",
  "imageUrl": "https://r2.trash.myx.is/quiz/abc.jpg",
  "options": ["paper", "plastic", "food", "mixed"],
  "difficulty": 2
}
```

---

## 🎨 Frontend Components

| Component | Purpose |
|-----------|---------|
| Scanner.tsx | Camera interface + classification display |
| Quiz.tsx | Quiz game with 3 modes (normal, hard, expert) |
| Stats.tsx | User statistics + leaderboard |
| Admin.tsx | Image approval + batch operations |
| Settings.tsx | User preferences (region, quiz timer, language) |
| LiveMode.tsx | Real-time classification stream |
| AdSlot.tsx | Sponsor advertising display |
| WelcomeIntro.tsx | First-time user onboarding |

---

## 🇮🇸 Icelandic Grammar (Íslensk málfræði)

**Use the `icelandic-reviewer` agent for grammar checking.**

### Fallbeygingar (Case Declensions)

| Fall | Spurning | Dæmi |
|------|----------|------|
| Nefnifall | Hver/hvað? | hestur, tunna |
| Þolfall | Hvern/hvað? | hest, tunnu |
| Þágufall | Hverjum/hverju? | hesti, tunnu |
| Eignarfall | Hvers? | hests, tunnu |

### Common Errors to Avoid

| Wrong | Correct | Rule |
|-------|---------|------|
| með skilagjald | með skilagjaldi | með + þágufall |
| þú skila | þú skilar | 2. persóna eintölu |
| Endurvinnslan (þf.) | endurvinnsluna | þolfall með greini |
| peningana | peninginn | eintala, ekki fleirtala |

### Resources

- **MCP Server:** `icelandic-morphology` (BÍN lookups via `.mcp.json`)
- **API:** [Yfirlestur.is](https://yfirlestur.is/) (GreynirCorrect)
- **Database:** [BÍN](https://bin.arnastofnun.is/) (Beygingarlýsing íslensks nútímamáls)

---

## 🚫 What NOT to Do

1. **Never classify PLA/3D prints as recyclable plastic**
2. **Never classify bioplastics as compostable/food waste**
3. **Never show UI elements in English** (all Icelandic, use translations.ts)
4. **Never store raw images permanently** (R2 only for quiz, review enabled)
5. **Never expose API keys** (use wrangler secrets)
6. **Never use string concatenation in SQL** (use parameterized queries)
7. **Never skip rate limiting** (30 req/min per IP)
8. **Never write Icelandic with wrong fallbeygingar** (use icelandic-reviewer agent)

---

## ✅ Checklist Before Deploying

- [ ] Run `npm run build` in root — verify PWA builds
- [ ] Run `npm run dev` in worker/ — test all endpoints
- [ ] Check iceland-rules.ts has all overrides
- [ ] Verify D1 migrations applied: `--remote`
- [ ] Set secrets: `GEMINI_API_KEY`, `ADMIN_PASSWORD`
- [ ] Test rate limiting works
- [ ] Verify Icelandic error messages
- [ ] Check PWA manifest and icons

---

## 🔗 Related Links

- [SORPA Flokkun](https://sorpa.is/flokkunartafla)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

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
**Last Updated:** January 22, 2026
