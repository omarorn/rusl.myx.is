# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Commit Guidelines

**Allar commit skilaboð á ÍSLENSKU:**
```bash
# Dæmi um commit skilaboð:
git commit -m "Bætti við yfirferðarkerfi með Gemini Pro"
git commit -m "Lagaði villu með localStorage á farsímum"
git commit -m "Uppfærði flokkunarreglur fyrir Akureyri"
```

**Format:**
- Stutt og hnitmiðað (50 stafir eða minna)
- Notaðu sagnir í þátíð: "Bætti við", "Lagaði", "Uppfærði", "Fjarlægði"
- Ekki nota punkta í lokin

## Development Commands

```bash
# Backend (Worker)
npm install
npm run dev              # Local dev server on port 8787
npm run deploy           # Deploy to Cloudflare

# Database
npm run db:migrate                                                    # Apply migrations locally
npx wrangler d1 execute trash-myx-db --local --command "SQL"          # Query local
npx wrangler d1 execute trash-myx-db --remote --command "SQL"         # Query production
npx wrangler d1 execute trash-myx-db --remote --file=./migrations/0001_init.sql  # Run migration file

# Secrets
wrangler secret put HF_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put CLAUDE_API_KEY  # Optional for deep review
```

## Architecture

**Classification Flow:**
```
Image (base64) → Gemini 2.0 Flash → Iceland Rules → Response
                        ↓
            [Hourly] Post-Processing Review (Gemini Pro)
                        ↓
                 Update DB with refined results
```

**Key Files:**
- `src/index.ts` — Hono app entry, route mounting, CORS, cron handler
- `src/routes/identify.ts` — Main classification endpoint with rate limiting
- `src/routes/review.ts` — Review stats and manual trigger endpoint
- `src/services/classifier.ts` — Orchestrates classification logic
- `src/services/iceland-rules.ts` — **CRITICAL** bin mapping and overrides
- `src/services/gemini.ts` — Gemini 2.0 Flash primary classifier
- `src/services/review.ts` — Hourly post-processing with Gemini Pro
- `src/data/regions.ts` — Regional waste rules documentation

**Cloudflare Bindings:**
- `DB` (D1) — Scans, users, quiz_images, review_log tables
- `CACHE` (KV) — Rate limiting (`ratelimit:{ip}`)
- `IMAGES` (R2) — Image storage for quiz and review

**Cron Trigger:**
- Runs every hour (`0 * * * *`)
- Reviews low-confidence classifications with Gemini Pro
- Updates DB with refined results

## MCP & Plugin Integration

**Available MCP Tools:**
- `greptile` — Code review and PR analysis
- `claude-in-chrome` — Browser automation for testing

**Useful Plugins:**
- `huggingface-skills` — HuggingFace Hub operations (download models, datasets)
- `cloudflare-troubleshooting` — Investigate Cloudflare issues

## Critical Business Rules

**These overrides in `iceland-rules.ts` MUST be applied regardless of AI output:**

| Item | Bin | Reason |
|------|-----|--------|
| PLA, ABS, PETG, 3D printed | `mixed` | SORPA cannot process |
| Bioplastic, compostable plastic | `mixed` | No industrial composting in Iceland |
| TetraPak, milk/juice cartons | `paper` | Shipped to Sweden for processing |
| Styrofoam, polystyrene | `recycling_center` | Contaminates plastic recycling |
| Greasy cardboard, pizza boxes | `mixed` | >2% fat contaminates paper recycling |

**Never:**
- Classify PLA/3D prints as recyclable plastic
- Classify bioplastics as compostable/food waste
- Use English in user-facing text (all Icelandic)

## API Patterns

**Parameterized Queries (D1):**
```typescript
// Always use .bind() for user input
await env.DB.prepare('SELECT * FROM scans WHERE user_hash = ?').bind(userHash).first();
```

**Error Responses:**
```typescript
// All user-facing errors in Icelandic
return c.json({ error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.' }, 429);
return c.json({ error: 'Mynd vantar.' }, 400);
```

**Rate Limiting:** 100 requests/minute per IP, stored in KV with 60s TTL.

## Bin Types

```typescript
type BinType = 'paper' | 'plastic' | 'food' | 'mixed' | 'recycling_center';
```

| Bin | Icelandic | Notes |
|-----|-----------|-------|
| `paper` | Pappír og pappi | Blue bin, includes TetraPak |
| `plastic` | Plastumbúðir | Green bin, includes metals |
| `food` | Matarleifar | Brown bin, in paper bags |
| `mixed` | Blandaður úrgangur | Gray bin, default fallback |
| `recycling_center` | Endurvinnslustöð | Glass, batteries, foam, clothes |
