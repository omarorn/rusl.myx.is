# GitHub Copilot Instructions — Trasshy (rusl.myx.is / trash.myx.is)

These instructions are derived from `CLAUDE.md` and are the source of truth for Copilot-assisted changes in this repository.

## Project snapshot

- **Project:** Trasshy — Icelandic waste classification with AI
- **Domains:**
  - `rusl.myx.is` — Icelandic default
  - `trash.myx.is` — English default
- **Stack:** React + TypeScript + Tailwind + Vite PWA; Cloudflare Workers (Hono) + D1 + R2 + KV; Cloudflare AI primary + Gemini fallback
- **Branding:** App title/header is **“Trasshy”** (do not revert).

## Non-negotiable business rules

- **Iceland overrides are mandatory.** The overrides in `worker/src/services/iceland-rules.ts` MUST be applied regardless of model output.
- **Never classify:**
  - PLA / 3D printed plastics as recyclable plastic
  - Bioplastics as compostable / food waste
- **Never show Icelandic UI text in English.** Use `src/locales/translations.ts`.
- **Never expose secrets** (API keys, admin password). Use `wrangler secret put`.
- **Never use string concatenation in SQL.** Always use parameterized D1 queries.
- **Never skip rate limiting.** Default policy: **30 requests/minute per IP** using KV.
- **Never store raw user images permanently.** Images in R2 are for quiz/review flows only.

## Recent behavior contracts (must preserve)

### FunFacts (Fróðleikur)

- FunFacts are derived from **approved** scan-backed entries in D1 table `quiz_images` (`approved = 1`).
- Icons are stored in R2 under keys like `quiz/icons/<name>_<bin>_<timestamp>.png`.
- UI shows the icon by default (if available) and reveals the original via toggle.
- Backend exposes best-effort detail enrichment:
  - `GET /api/funfacts/detail/:id` may extract optional joke metadata from R2 custom metadata.

### “Rangt?” feedback

- The “Rangt?” button MUST NOT open email.
- It flags for review via `POST /api/review/flag` and stores a row in D1 table `review_flags`.

### Joke of the Day

- `GET /api/stats/joke` MUST return `backgroundUrl` pointing at `/api/quiz/image/jokes/background_<ts>.png`.
- If AI generation fails, still attach a known existing background so desktop visuals remain consistent.

### Image serving conventions

- `/api/quiz/image/*` must tolerate both percent-encoded and decoded keys.
- It should try common prefix variants (e.g. toggling `quiz/` for `icons/` and `jokes/`).

## Code patterns to follow

### D1 (SQLite) — use parameterized queries

- Prefer `env.DB.prepare("...").bind(...).all()/first()/run()`.
- Do not interpolate user data into SQL strings.

### KV rate limiting

- Keep the existing rate-limiting pattern (per-IP key, 60s TTL, max 30).

### Error responses

- All **user-facing errors must be Icelandic** (even if internal logs are English).
- Prefer consistent shapes: `{ error: "..." }` with correct HTTP status.

## Where to make changes

- Frontend app (PWA): `src/` (React)
- Worker API: `worker/src/` (Hono routes in `worker/src/routes/`)
- D1 migrations: `worker/migrations/` (append-only, never edit applied migrations)

## API contract guardrails

- Preserve response shapes for:
  - `POST /api/identify`
  - `GET /api/stats/joke`
  - FunFacts endpoints (`/api/funfacts*`)
  - Image serving (`/api/quiz/image/*`)
- When changing payloads, keep backward-compatible fields where feasible.

## Testing expectations

- Backend tests use Vitest (`worker/src/__tests__/`).
- `worker/src/services/iceland-rules.ts` is critical; adjust tests when altering override logic.

## Commands (developer workflow)

### Frontend

```bash
npm install
npm run dev
npm run build
npm run preview
```

### Worker

```bash
cd worker
npm install
npm run dev
npm run deploy
```

### D1

```bash
cd worker
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM scans LIMIT 10"
npx wrangler d1 execute trash-myx-db --remote --command "SELECT COUNT(*) FROM users"
npx wrangler d1 migrations apply trash-myx-db --local
npx wrangler d1 migrations apply trash-myx-db --remote
```

## Before deploying

- Run root `npm run build` and confirm the PWA builds.
- Run `npm test` in `worker/` if you touched Worker logic.
- Verify D1 migrations are applied (`--remote`) when schema changes.
- Verify Icelandic error messages and rate limiting.
- Ensure no secrets are committed.
