# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rusl.myx.is** — Icelandic waste classification system using AI.

Two products sharing a backend:
- **PWA (trash.myx.is)** — Mobile camera-based classification
- **TrashPi** — IoT device for physical bins (Raspberry Pi)

**Tech Stack:**
- Backend: Cloudflare Workers + Hono + D1 + R2 + KV
- Frontend: React + TypeScript + Tailwind CSS + Vite
- AI: HuggingFace (primary) + Gemini (fallback)

## Development Commands

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

### Database (D1)
```bash
cd worker
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM scans"
npx wrangler d1 execute trash-myx-db --remote --command "SELECT * FROM users"
npx wrangler d1 execute trash-myx-db --remote --file=./migrations/0001_init.sql
```

### Secrets
```bash
cd worker
wrangler secret put HF_API_KEY
wrangler secret put GEMINI_API_KEY
```

## Architecture

```
Image (base64) → HuggingFace API → Confidence ≥80% → Iceland Rules → Response
                                 ↘ Confidence <80% → Gemini Fallback ↗
```

**Key Backend Files:**
- `worker/src/index.ts` — Hono app entry, route mounting
- `worker/src/routes/identify.ts` — Classification endpoint, rate limiting, gamification
- `worker/src/services/classifier.ts` — Orchestrates HF → Gemini fallback
- `worker/src/services/iceland-rules.ts` — CRITICAL: bin mapping and overrides
- `worker/src/services/huggingface.ts` — HuggingFace Inference API client
- `worker/src/services/gemini.ts` — Gemini 2.0 Flash-Lite fallback

**Cloudflare Bindings:**
| Resource | Binding | Purpose |
|----------|---------|---------|
| D1 | `DB` | Scans, users, fun_facts |
| KV | `CACHE` | Rate limiting |
| R2 | `IMAGES` | Debug images (disabled) |

## Critical: Iceland-Specific Rules

**These overrides in `worker/src/services/iceland-rules.ts` MUST be applied regardless of AI model output:**

| Item | Bin | Reason |
|------|-----|--------|
| PLA, ABS, PETG, 3D printed | `mixed` | SORPA cannot process |
| Bioplastic, compostable plastic | `mixed` | No industrial composting in Iceland |
| TetraPak, milk/juice cartons | `paper` | Shipped to Sweden |
| Styrofoam, polystyrene | `recycling_center` | Contaminates plastic recycling |
| Greasy cardboard, pizza boxes | `mixed` | Fat contaminates paper recycling |
| Glass | `recycling_center` | Not collected in home bins |

**Never:**
- Classify PLA/3D prints as recyclable plastic
- Classify bioplastics as compostable/food waste
- Show UI text in English (all user-facing text in Icelandic)

## Bin Types

```typescript
type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center';
```

| Bin | Icelandic Name | Color | Notes |
|-----|----------------|-------|-------|
| `paper` | Pappír og pappi | Blue | Includes TetraPak |
| `plastic` | Plastumbúðir | Green | Includes metals |
| `food` | Matarleifar | Brown | In paper bags only |
| `mixed` | Blandaður úrgangur | Gray | Default fallback |
| `recycling_center` | Endurvinnslustöð | Purple | Glass, batteries, foam, clothes |

## API Patterns

**Parameterized Queries (D1):**
```typescript
// Always use .bind() for user input
await env.DB.prepare('SELECT * FROM scans WHERE user_hash = ?').bind(userHash).first();
```

**Error Responses (Icelandic):**
```typescript
return c.json({ error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.' }, 429);
return c.json({ error: 'Mynd vantar.' }, 400);
return c.json({ error: 'Villa kom upp.' }, 500);
```

**Rate Limiting:** 30 requests/minute per IP, stored in KV with 60s TTL.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/identify` | Classify image, returns bin + points |
| GET | `/api/stats` | User statistics |
| GET | `/api/stats/leaderboard` | Top users |
| GET | `/api/stats/global` | Global statistics |
| GET | `/api/rules` | List municipalities |
| GET | `/api/rules/:sveitarfelag` | Rules for municipality |

## Database Schema

Three tables in D1:
- `scans` — Classification history (user_hash, item, bin, confidence, location)
- `users` — Gamification (total_scans, total_points, current_streak, best_streak)
- `fun_facts` — Educational content in Icelandic
