# Project Overview: rusl.myx.is

## Purpose
"Trasshy" — An Icelandic waste classification system using AI. Users photograph trash items and the app identifies what recycling bin they belong in, following Iceland-specific SORPA rules. Two products share one backend: a mobile PWA (trash.myx.is) for camera-based classification, and TrashPi, a planned IoT device (Raspberry Pi) for physical bin sorting. Features include gamification (points, streaks, leaderboards), a quiz game, fun facts, joke of the day, sponsor ads, and admin tools.

## Tech Stack
- **Frontend (PWA):** React 18 + TypeScript + Tailwind CSS + Vite + vite-plugin-pwa
- **Backend:** Cloudflare Workers + Hono framework
- **Database:** Cloudflare D1 (SQLite) — scans, users, quiz, ads tables
- **Storage:** Cloudflare R2 (images for quiz, icons, jokes)
- **Cache:** Cloudflare KV (rate limiting, session data)
- **AI (Primary):** Cloudflare AI (llava-1.5-7b-hf for classification)
- **AI (Fallback):** Google Gemini (multiple models for classification, icons, jokes, TTS, image editing)
- **IoT (Future):** Raspberry Pi + Python + TFLite
- **Testing:** Vitest (28 unit tests for iceland-rules)

## Key Files
- `src/` — PWA React frontend source
  - `src/components/` — Scanner, Quiz, Stats, Admin, Settings, LiveMode, AdSlot
  - `src/context/` — React context providers
  - `src/hooks/` — Custom hooks
  - `src/locales/` — i18n translations
  - `src/services/` — API client
- `worker/` — Cloudflare Worker backend
  - `worker/src/index.ts` — Hono app entry point
  - `worker/src/routes/` — API routes (identify, stats, rules, quiz, describe)
  - `worker/src/services/` — Business logic (huggingface, gemini, iceland-rules, joke-generator, image-gen, review)
  - `worker/src/__tests__/` — Vitest unit tests
  - `worker/migrations/` — D1 SQL migrations
  - `worker/wrangler.toml` — Cloudflare Worker config
- `trashpi/` — Raspberry Pi IoT code (Python)
- `CLAUDE.md` — Comprehensive project instructions (source of truth for AI agents)
- `TODO.md` — Task tracking
- `PLAN.md` — Project roadmap

## Build/Run Commands
- **Frontend:** `npm install && npm run dev` (port 5173)
- **Frontend build:** `npm run build`
- **Backend:** `cd worker && npm install && npm run dev` (port 8787)
- **Backend deploy:** `cd worker && npm run deploy`
- **Tests:** `cd worker && npm test` (or `npm run test:watch`)
- **D1 local query:** `cd worker && npx wrangler d1 execute trash-myx-db --local --command "SELECT ..."`
- **D1 remote query:** `cd worker && npx wrangler d1 execute trash-myx-db --remote --command "SELECT ..."`
- **D1 migrations:** `cd worker && npx wrangler d1 migrations apply trash-myx-db --remote`

## Notes
- Iceland-specific recycling rules are critical and override AI output (PLA -> mixed, bioplastics -> mixed, TetraPak -> paper, styrofoam -> recycling_center)
- All user-facing text must be in Icelandic; error messages in Icelandic
- AI classification flow: Cloudflare AI first, fallback to Gemini if confidence < 70%, then apply Iceland rules engine
- Rate limiting: 30 req/min per IP via KV
- Parameterized D1 queries only (no string concatenation for SQL)
- Domains: rusl.myx.is (Icelandic default), trash.myx.is (English default)
- Extensive `.claude/rules/` with golden rules, pre-commit validation, Tailwind production, HTML escaping, and more
- Custom Claude agents and skills for Icelandic grammar review
- Secrets managed via `wrangler secret put` (GEMINI_API_KEY, ADMIN_PASSWORD)
- Developed by 2076 ehf (Omar Orn Magnusson)
