# rusl.myx.is — Verkefna Plan
> Síðast uppfært: 22. janúar 2026
> Version: 1.3.0

---

## 🎯 Verkefnisyfirlit

**Tvær vörur, tvö lén:**
1. **📱 rusl.myx.is** — PWA á íslensku (sjálfgefið)
2. **📱 trash.myx.is** — PWA á ensku (sjálfgefið)
3. **🏠 TrashPi** — IoT device fyrir heimili/skóla

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS + Vite PWA
- Backend: Cloudflare Workers + Hono + D1 + R2 + KV
- AI: Cloudflare AI + Gemini fallback

---

## ✅ Lokið (Completed)

### Backend - Worker v1.3.0 ✅

| Route | Endpoint | Lýsing |
|-------|----------|--------|
| identify | POST `/api/identify` | Myndgreining |
| describe | POST `/api/describe` | Textalýsing |
| rules | GET `/api/rules/:sveitarfelag` | Sveitarfélaga reglur |
| stats | GET `/api/stats/*` | Tölfræði + leaderboard |
| quiz | GET/POST `/api/quiz/*` | Quiz leikur |
| ads | GET/POST `/api/ads/*` | Auglýsingakerfi |
| review | GET/POST `/api/review/*` | Post-processing |
| admin | GET/PUT/DELETE `/api/admin/*` | Myndastjórnun |

### Frontend - PWA ✅

| Component | Lýsing | Staða |
|-----------|--------|-------|
| Scanner.tsx | Myndavél + greining | ✅ |
| Quiz.tsx | Quiz leikur (3 stillingar) | ✅ |
| Stats.tsx | Tölfræði + leaderboard | ✅ |
| Admin.tsx | Myndastjórnun | ✅ |
| Settings.tsx | Stillingar (sveitarfélag, TTS) | ✅ |
| AdSlot.tsx | Auglýsingakerfi | ✅ |
| LiveMode.tsx | Bein greining | ✅ |
| WelcomeIntro.tsx | Intro wizard | ✅ |
| DesktopWrapper.tsx | Desktop layout | ✅ |
| SponsorCard.tsx | Styrktaraðilar | ✅ |

### Cloudflare Resources ✅

| Resource | Nafn | ID |
|----------|------|----|
| D1 | `trash-myx-db` | `56f8b19e-c7bb-40e1-b5f9-a47eb2d06b93` |
| R2 | `trash-myx-images` | ✅ |
| KV | `trash-myx-cache` | `e5536c0571954289b4d21d9ad35918ef` |

### D1 Migrations ✅

| Migration | Lýsing |
|-----------|--------|
| 0001_init.sql | Core tables (scans, users, fun_facts) |
| 0002_quiz_images.sql | Quiz og myndir |
| 0003_ads_system.sql | Auglýsingakerfi |
| 0004_review_tracking.sql | Review tracking |

### Features ✅

- [x] Grunnkerfi fyrir myndgreiningu
- [x] Quiz leikur með þremur stillingum
- [x] Leaderboard og stigakerfi
- [x] Íslenskar reglur fyrir SORPA
- [x] TTS með íslensku röddum
- [x] PWA stuðningur (manifest, service worker, icons)
- [x] Admin panel með lykilorðsvörn
- [x] Batch aðgerðir (samþykkja/hafna mörgum)
- [x] Sjálfvirk klipping á breiðum myndum
- [x] Multi-object detection
- [x] Grínkenndar athugasemdir
- [x] Cartoon stíll með nanó banana
- [x] Pabba-brandara í svörum

### Quiz & Settings (v1.3.0) ✅
- [x] Per-question timer (stillanlegt: 3, 5, 10, 15, 30 sek)
- [x] Timeout telst sem rangt svar
- [x] Timer UI í Settings

### Multi-Domain & Language (v1.3.0) ✅
- [x] rusl.myx.is → Íslenska sjálfgefið
- [x] trash.myx.is → Enska sjálfgefið
- [x] Domain detection í SettingsContext
- [x] wrangler.toml með báðum lénum

### Íslensk Málfræði Tools (v1.3.0) ✅
- [x] Endurbættar AI prompts með réttum fallbeygingum
- [x] icelandic-reviewer agent (.claude/Agents/)
- [x] icelandic-grammar skill (.claude/skills/)
- [x] Icelandic Morphology MCP server (.mcp.json)
- [x] CLAUDE.md uppfært með málfræðikafla

---

## 🔄 Í Vinnslu / Næst

### UX Endurbætur
- [ ] Sýna öll hlutir í breiðri mynd með merkingum (bounding boxes)
- [ ] Leyfa að velja hlut til að flokka úr lista
- [ ] Betri animation þegar cartoon mode er valið

### Tæknileg vinna
- [ ] Bæta við prófum (unit tests)
- [ ] Performance optimization
- [ ] Offline stuðningur (full offline mode)

### Deploy ✅
- [x] Custom domain `trash.myx.is` virkt
- [x] Custom domain `rusl.myx.is` virkt
- [x] SSL certificate verification

---

## ⏸️ Framtíðarverk

### TrashPi (IoT)
- [ ] TFLite model conversion
- [ ] LED control (WS2812B)
- [ ] Audio feedback (TTS)
- [ ] Motion sensor trigger
- [ ] Offline mode á Pi

### Expansion
- [ ] Fleiri sveitarfélög (Akureyri, Ísafjörður)
- [ ] API fyrir þriðja aðila
- [ ] School partnerships

---

## 📁 Skráarskipulag

```
C:\git\rusl.myx.is\
├── .claude/                     # Claude Code config
│   ├── Agents/                  # icelandic-reviewer.md
│   ├── commands/
│   ├── rules/                   # golden-rules.md, task-status.md
│   ├── skills/                  # icelandic-grammar.md
│   └── settings.json
├── .mcp.json                    # MCP servers (icelandic-morphology)
├── dist/                        # PWA build output ✅
│   ├── assets/
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── *.png (icons)
├── public/                      # Static assets
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── og-image.jpg
├── src/                         # Frontend source ✅
│   ├── components/
│   │   ├── Admin.tsx            # ✅
│   │   ├── AdSlot.tsx           # ✅
│   │   ├── DesktopWrapper.tsx   # ✅
│   │   ├── LiveMode.tsx         # ✅
│   │   ├── Quiz.tsx             # ✅
│   │   ├── Scanner.tsx          # ✅
│   │   ├── Settings.tsx         # ✅
│   │   ├── SponsorCard.tsx      # ✅
│   │   ├── Stats.tsx            # ✅
│   │   └── WelcomeIntro.tsx     # ✅
│   ├── context/
│   │   └── SettingsContext.tsx
│   ├── hooks/
│   │   └── useCamera.ts
│   ├── locales/
│   │   └── translations.ts
│   ├── services/
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── worker/                      # Backend ✅
│   ├── src/
│   │   ├── data/
│   │   │   └── regions.ts
│   │   ├── routes/
│   │   │   ├── admin.ts         # ✅
│   │   │   ├── ads.ts           # ✅
│   │   │   ├── describe.ts      # ✅
│   │   │   ├── identify.ts      # ✅
│   │   │   ├── quiz.ts          # ✅
│   │   │   ├── review.ts        # ✅
│   │   │   ├── rules.ts         # ✅
│   │   │   └── stats.ts         # ✅
│   │   ├── services/
│   │   │   ├── adService.ts
│   │   │   ├── classifier.ts
│   │   │   ├── cloudflare-ai.ts
│   │   │   ├── gamification.ts
│   │   │   ├── gemini.ts
│   │   │   ├── iceland-rules.ts
│   │   │   ├── joke-generator.ts
│   │   │   ├── location.ts
│   │   │   ├── ratelimit.ts
│   │   │   └── review.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_quiz_images.sql
│   │   ├── 0003_ads_system.sql
│   │   └── 0004_review_tracking.sql
│   ├── wrangler.toml
│   └── package.json
├── trashpi/                     # IoT (future)
│   ├── main.py
│   ├── requirements.txt
│   └── setup.sh
├── scripts/                     # Utility scripts
│   ├── sync-images.ps1
│   └── sync-images.sh
├── CLAUDE.md                    # Agent guidelines
├── README.md                    # Íslenska
├── README.en.md                 # English
├── TODO.md                      # Task list
├── PLAN.md                      # This file
└── package.json
```

---

## 🚀 Þróunarskipanir

### Frontend
```bash
npm install
npm run dev              # Port 5173
npm run build            # Build to dist/
npm run preview          # Preview build
```

### Backend
```bash
cd worker
npm install
npm run dev              # Port 8787
npm run deploy           # Deploy to Cloudflare
```

### Database
```bash
cd worker
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM scans LIMIT 10"
npx wrangler d1 execute trash-myx-db --remote --command "SELECT COUNT(*) FROM users"
```

### Secrets
```bash
cd worker
wrangler secret put GEMINI_API_KEY
wrangler secret put ADMIN_PASSWORD
```

---

## 📊 API Endpoints (v1.3.0)

### Core Classification
| Method | Path | Lýsing |
|--------|------|--------|
| POST | `/api/identify` | Greina mynd → tunna |
| POST | `/api/describe` | Lýsing á hlut → tunna |

### Rules
| Method | Path | Lýsing |
|--------|------|--------|
| GET | `/api/rules` | Listi sveitarfélaga |
| GET | `/api/rules/:id` | Reglur fyrir sveitarfélag |

### Stats & Gamification
| Method | Path | Lýsing |
|--------|------|--------|
| GET | `/api/stats` | User stats |
| GET | `/api/stats/leaderboard` | Top 10 |
| GET | `/api/stats/global` | Global stats |
| GET | `/api/stats/recent` | Recent scans |

### Quiz
| Method | Path | Lýsing |
|--------|------|--------|
| GET | `/api/quiz/random` | Random question |
| POST | `/api/quiz/answer` | Submit answer |
| POST | `/api/quiz/score` | Update score |
| GET | `/api/quiz/leaderboard` | Quiz leaderboard |
| GET | `/api/quiz/stats` | Quiz statistics |

### Ads
| Method | Path | Lýsing |
|--------|------|--------|
| GET | `/api/ads` | Get current ad |
| POST | `/api/ads/click` | Track click |
| GET | `/api/ads/sponsors` | List sponsors |

### Admin
| Method | Path | Lýsing |
|--------|------|--------|
| GET | `/api/admin/images` | List images |
| PUT | `/api/admin/images/:id` | Update image |
| DELETE | `/api/admin/images/:id` | Delete image |
| POST | `/api/admin/images/batch` | Batch operations |
| GET | `/api/admin/stats` | Admin statistics |

---

## 🔗 Tenglar

- **Live (IS):** https://rusl.myx.is
- **Live (EN):** https://trash.myx.is
- **Repo:** github.com/omarorn/rusl.myx.is
- **SORPA:** sorpa.is/flokkunartafla
- **2076:** 2076.is

---

## 📈 Næsta Aðgerð

1. **Deploy Worker:**
   ```bash
   cd worker
   wrangler deploy
   ```

2. **Tengja custom domain:**
   - Cloudflare Dashboard → Workers → trash-myx → Settings → Triggers → Add Custom Domain

3. **Test live:**
   ```bash
   curl https://trash.myx.is/api
   ```

---

**Staða:** 🟢 Production Ready - v1.3.0 deployed on both domains
