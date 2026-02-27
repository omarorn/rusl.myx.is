# Golden Rules: rusl.myx.is Development

**Purpose**: Core development principles for the Icelandic waste classification system
**Last Updated**: 2026-02-01
**Applies to**: All rusl.myx.is development work

---

## Project Overview

**rusl.myx.is** — Icelandic waste classification system using AI.

Two products sharing a backend:
- **PWA (trash.myx.is)** — Mobile camera-based classification
- **TrashPi** — IoT device for physical bins (Raspberry Pi)

---

## Code Structure

```
rusl.myx.is/
├── src/                  # PWA frontend (React + TypeScript)
├── worker/               # Cloudflare Worker backend
│   ├── src/
│   │   ├── index.ts      # Hono app entry, route mounting
│   │   ├── routes/       # API handlers
│   │   └── services/     # Business logic
│   └── migrations/       # D1 database migrations
├── public/               # Static assets
└── CLAUDE.md             # Project guidance
```

---

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

---

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

---

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
```

---

## API Patterns

**Parameterized Queries (D1):**
```typescript
// Always use .bind() for user input - prevents SQL injection
await env.DB.prepare('SELECT * FROM scans WHERE user_hash = ?').bind(userHash).first();
```

**Error Responses (Icelandic):**
```typescript
return c.json({ error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.' }, 429);
return c.json({ error: 'Mynd vantar.' }, 400);
return c.json({ error: 'Villa kom upp.' }, 500);
```

**Rate Limiting:** 30 requests/minute per IP, stored in KV with 60s TTL.

---

## Platform Limitations (Cloudflare Workers)

- **No filesystem access**: Use R2 or D1, not `fs.readFile()`
- **128MB memory limit**: Stream large files, don't buffer
- **30s CPU time limit**: Keep operations fast
- **No Node.js APIs**: Use Web APIs (Request, Response, fetch)

---

## AI Models (Google Gemini)

**IMPORTANT:** Always use generic model names (e.g., `-latest`, `-lite`) to avoid deprecation.

### Model Configuration

| Service | Model | File | Reason |
|---------|-------|------|--------|
| **Classification** | `gemini-3.1-pro-preview` | `services/gemini.ts` | Best reasoning for accurate waste sorting |
| **Icon Generation** | `gemini-3-pro-image-preview` | `services/gemini.ts` | Specialized image model for high-quality icons |
| **Review Process** | `gemini-3.1-pro-preview` | `services/review.ts` | Critical accuracy for validation |
| **Image Descriptions** | `gemini-2.5-flash-lite` | `routes/describe.ts` | Fast TTS descriptions |
| **Joke Generation** | `gemini-2.5-flash-lite` | `services/joke-generator.ts` | Simple text, optimized for speed |
| **Joke Background** | `gemini-2.5-flash-image` | `services/joke-generator.ts` | Image generation model |
| **Image Cartoons** | `gemini-2.5-flash-image` | `services/image-gen.ts` | Image-to-image generation |
| **Text-to-Speech** | `gemini-2.5-flash-preview-tts` | `routes/describe.ts` | Specialized TTS model with audio support |

### Model Selection Guidelines

- **Use `gemini-flash-latest`** — General purpose, good balance of speed/accuracy
- **Use `gemini-2.5-flash-lite`** — Simple text tasks where speed matters (jokes, descriptions)
- **Use `gemini-2.5-flash-image`** — Image generation (cartoons, backgrounds)
- **Use `gemini-3-pro-image-preview`** — High-quality image generation (icons)
- **Use `gemini-2.5-flash-preview-tts`** — ONLY for text-to-speech audio generation

### Never Use
- ❌ Versioned models: `gemini-1.5-flash-8b`, `gemini-2.0-flash-001`
- ❌ Experimental suffix: `gemini-2.0-flash-exp`
- ❌ Specific builds: Any model with specific version numbers

**Exceptions:**
- Image models use specialized variants (`gemini-2.5-flash-image`, `gemini-3-pro-image-preview`)
- TTS requires preview model (`gemini-2.5-flash-preview-tts`)

---

## TypeScript

- **Type definitions**: Use proper interfaces for all data
- **No `any` types**: Use proper interfaces or `unknown`
- **Handler signatures**: Follow Hono patterns

---

## Never Assume - Always Verify

- **Before editing a file**: Use `Read` tool to see current content
- **Before using a function**: Check if it exists in the codebase
- **Before suggesting a library**: Verify it works with Cloudflare Workers

---

## Quick Reference

### Before Starting Any Task
1. Read `CLAUDE.md` - Essential project guidance
2. Check existing code patterns in `worker/src/`
3. Understand Iceland-specific rules

### During Task
- Keep error messages in Icelandic
- Follow existing code patterns
- Use parameterized queries for D1

### After Task
- Test locally with `npm run dev`
- Deploy with `npm run deploy`
- Monitor logs with `npx wrangler tail`


### before createing or updating features
 - Always create the tests first.
 - test thourogly and update previus documents rather than creating new
 - always check if feature exists before creating it.
 - always update the menu with new pages or the todo.md

---

**These golden rules ensure consistent, high-quality code for rusl.myx.is.**
