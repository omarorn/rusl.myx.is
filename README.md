<p align="center">
  <img src="pwa/rusl.myx.is.jpg" alt="rusl.myx.is banner" width="100%" />
</p>

# 🗑️ rusl.myx.is — Íslensk ruslaflokkun með gervigreind

> Greindu rusl með myndavélinni og finndu rétta tunnuna

**[🇬🇧 English version](./README.en.md)**

Tvær vörur — einn heili:
- **📱 trash.myx.is** — PWA fyrir síma
- **🏠 TrashPi** — Standalone IoT box fyrir heimili/skóla/fyrirtæki

---

## 🚀 Quick Start

### Worker (Backend)

```bash
cd worker
npm install
wrangler secret put HF_API_KEY      # HuggingFace token
wrangler secret put GEMINI_API_KEY  # Google Gemini token
wrangler deploy
```

### PWA (Frontend)

```bash
npm install
npm run dev      # Development
npm run build    # Production build
```

### TrashPi (IoT)

```bash
cd trashpi
pip install -r requirements.txt
python main.py
```

### Prófanir (Testing)

```bash
cd worker
npm test                 # Keyra öll próf
npm run test:watch       # Keyra í watch mode
```

**Próf:** 28 unit tests fyrir `iceland-rules.ts` (bin mapping, overrides, Ísland-sértækar reglur)

---

## 📁 Möppuskipulag

```
rusl.myx.is/
├── worker/                 # Cloudflare Worker backend
│   ├── src/
│   │   ├── __tests__/      # Unit tests (Vitest)
│   │   ├── index.ts        # Hono entry point
│   │   ├── routes/         # API routes
│   │   │   ├── identify.ts # POST /api/identify
│   │   │   ├── stats.ts    # GET /api/stats
│   │   │   └── rules.ts    # GET /api/rules
│   │   └── services/       # Business logic
│   │       ├── huggingface.ts
│   │       ├── gemini.ts
│   │       └── iceland-rules.ts
│   ├── migrations/
│   ├── vitest.config.ts    # Test config
│   ├── wrangler.toml
│   └── package.json
├── src/                    # PWA React frontend
│   ├── components/
│   │   ├── Camera.tsx
│   │   ├── Result.tsx
│   │   └── Stats.tsx
│   ├── hooks/
│   │   └── useCamera.ts
│   └── services/
│       └── api.ts
├── trashpi/                # Raspberry Pi Python
│   ├── main.py
│   └── requirements.txt
├── CLAUDE.md               # Agent guidelines
└── README.md               # This file
```

---

## 🏗️ Arkitektúr

```
┌─────────────────────────────────────────────────────────┐
│                   SHARED BACKEND                        │
│              (Cloudflare Workers + D1)                  │
│                  trash.myx.is/api                       │
├─────────────────────────────────────────────────────────┤
│  HuggingFace (watersplash/waste-classification)         │
│       ↓ confidence < 80%                                │
│  Gemini 2.5 Flash-Lite (fallback)                       │
│       ↓                                                 │
│  Iceland Rules Engine (PLA→mixed, TetraPak→paper)       │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌────────────┐         ┌────────────┐
│ 📱 PWA     │         │ 🏠 TrashPi │
│ React+Vite │         │ Pi+Camera  │
└────────────┘         └────────────┘
```

---

## ☁️ Cloudflare Resources

| Resource | Nafn | ID |
|----------|------|----|
| D1 | `trash-myx-db` | `56f8b19e-c7bb-40e1-b5f9-a47eb2d06b93` |
| R2 | `trash-myx-images` | — |
| KV | `trash-myx-cache` | `e5536c0571954289b4d21d9ad35918ef` |

---

## 🎯 API Endpoints

| Method | Path | Lýsing |
|--------|------|--------|
| POST | `/api/identify` | Greina mynd og skila tunnu |
| GET | `/api/stats` | Notenda tölfræði |
| GET | `/api/stats/leaderboard` | Stigatafla |
| GET | `/api/stats/global` | Heildar tölfræði |
| GET | `/api/rules` | Listi yfir sveitarfélög |
| GET | `/api/rules/:sveitarfelag` | Reglur fyrir sveitarfélag |

### POST /api/identify

```json
{
  "image": "base64...",
  "lat": 64.1466,
  "lng": -21.9426,
  "userHash": "anonymous_user_id"
}
```

Response:
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
  "confidence": 0.94,
  "points": 15,
  "streak": 3,
  "funFact": "Gler má endurvinna endalaust..."
}
```

---

## 🗑️ Flokkar (SORPA kerfi)

| Litur | Tunna | Dæmi |
|-------|-------|------|
| 🔵 | Pappír og pappi | Dagblöð, kassar, TetraPak |
| 🟢 | Plastumbúðir + málmar | Flöskur, dósir, pokar |
| 🟤 | Matarleifar | Matur í pappírspoka |
| ⬜ | Blandaður úrgangur | Bleyjur, rusl |
| 🟣 | Endurvinnslustöð | Gler, raf, föt |

---

## ⚠️ Íslenskar reglur (mikilvægt!)

**Edge cases sem krefjast sérstakrar meðhöndlunar:**

| Hlutur | Réttur flokkur | Ástæða |
|--------|----------------|--------|
| 3D prentað (PLA/ABS/PETG) | ⬜ Blandað | Blandast ekki í hefðbundna endurvinnslu |
| Bíóplast / lífbrjótanlegt | ⬜ Blandað | SORPA getur ekki unnið úr því |
| TetraPak | 🔵 Pappír | Sent til Svíþjóðar |
| Froðuplast (styrofoam) | 🟣 Stöð | Fer ekki í heimatunnu |
| Fitugt pappakassi (pizza) | ⬜ Blandað | >2% fita spillir endurvinnslu |

---

## 💰 Kostnaður

| Þjónusta | Ókeypis | Kostnaður eftir |
|----------|---------|-----------------|
| HuggingFace | 1000 req/dag | ~$0.01/1000 |
| Gemini Flash-Lite | 1500 req/dag | ~$0.075/1000 |
| D1 | 5M reads/dag | $0.001/M reads |
| Workers | 100K req/dag | $5/10M req |

**Áætlaður kostnaður:** $2-5/mánuð fyrir 100K skannanir.

---

## 🔧 Deployment

### Worker

```bash
cd worker
npm install
wrangler secret put HF_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

### Custom Domain

1. Farðu í [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers → trash-myx → Settings → Triggers
3. Add Custom Domain → `trash.myx.is`

### PWA á Cloudflare Pages

```bash
npm run build
# Upload dist/ to Pages
```

---

## 📚 Tenglar

- [CLAUDE.md](./CLAUDE.md) — Agent leiðbeiningar
- [HuggingFace Model](https://huggingface.co/watersplash/waste-classification)
- [SORPA](https://sorpa.is) — Flokkun á höfuðborgarsvæðinu
- [2076.is](https://2076.is) — Þróunaraðili

---

## 💚 Styrktaraðilar / Sponsors

Þetta verkefni er styrkt af:

<table>
  <tr>
    <td align="center" width="200">
      <a href="https://litla.gamaleigan.is">
        <img src="https://litla.gamaleigan.is/logo.svg" width="100" alt="Litla Gámaleigan"><br>
        <strong>Litla Gámaleigan</strong>
      </a>
      <br>
      <sub>Gámaleiga fyrir alla</sub>
    </td>
    <td align="center" width="200">
      <a href="https://2076.is">
        <img src="https://2076.is/logo.svg" width="100" alt="2076 ehf"><br>
        <strong>2076 ehf</strong>
      </a>
      <br>
      <sub>Við leysum vandamál með tækni</sub>
    </td>
    <td align="center" width="200">
      <em>Auglýsingapláss</em>
      <br><br>
      <a href="mailto:omar@2076.is">Hafðu samband</a>
      <br>
      <sub>Styrktu íslenska endurvinnslu</sub>
    </td>
  </tr>
</table>

> Viltu styrkja verkefnið eða auglýsa? [Hafðu samband](mailto:omar@2076.is)

---

## 📄 Leyfi

MIT © 2076 ehf

---

<p align="center">
  <sub>Þróað af <strong>2076 ehf</strong> — við leysum vandamál með tækni</sub>
</p>
