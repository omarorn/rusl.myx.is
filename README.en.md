<p align="center">
  <img src="pwa/rusl.myx.is.jpg" alt="rusl.myx.is banner" width="100%" />
</p>

# rusl.myx.is — Icelandic Waste Classification with AI

> Scan waste with your camera and find the right bin

Two products — one brain:
- **📱 trash.myx.is** — Mobile PWA
- **🏠 TrashPi** — Standalone IoT device for homes/schools/businesses

---

## Quick Start

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

---

## Directory Structure

```
rusl.myx.is/
├── worker/                 # Cloudflare Worker backend
│   ├── src/
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
└── README.md               # Icelandic README
```

---

## Architecture

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

## Cloudflare Resources

| Resource | Name | ID |
|----------|------|----|
| D1 | `trash-myx-db` | `56f8b19e-c7bb-40e1-b5f9-a47eb2d06b93` |
| R2 | `trash-myx-images` | — |
| KV | `trash-myx-cache` | `e5536c0571954289b4d21d9ad35918ef` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/identify` | Classify image and return bin |
| GET | `/api/stats` | User statistics |
| GET | `/api/stats/leaderboard` | Leaderboard |
| GET | `/api/stats/global` | Global statistics |
| GET | `/api/rules` | List municipalities |
| GET | `/api/rules/:municipality` | Rules for municipality |

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
  "item": "plastic bottle",
  "bin": "plastic",
  "binInfo": {
    "name_is": "Plastumbúðir",
    "name_en": "Plastic packaging",
    "color": "#16a34a",
    "icon": "🧴"
  },
  "confidence": 0.94,
  "points": 15,
  "streak": 3,
  "funFact": "Glass can be recycled endlessly..."
}
```

---

## Waste Categories (SORPA system)

| Color | Bin | Examples |
|-------|-----|----------|
| 🔵 | Paper and cardboard | Newspapers, boxes, TetraPak |
| 🟢 | Plastic packaging + metals | Bottles, cans, bags |
| 🟤 | Food waste | Food in paper bags |
| ⬜ | Mixed waste | Diapers, general trash |
| 🟣 | Recycling center | Glass, electronics, clothes |

---

## Iceland-Specific Rules (Important!)

**Edge cases requiring special handling:**

| Item | Correct category | Reason |
|------|------------------|--------|
| 3D printed (PLA/ABS/PETG) | ⬜ Mixed | Does not mix with standard recycling |
| Bioplastic / biodegradable | ⬜ Mixed | SORPA cannot process it |
| TetraPak | 🔵 Paper | Shipped to Sweden |
| Styrofoam | 🟣 Recycling center | Not for home bins |
| Greasy pizza boxes | ⬜ Mixed | >2% fat contaminates paper recycling |

---

## Cost Estimate

| Service | Free tier | Cost after |
|---------|-----------|------------|
| HuggingFace | 1000 req/day | ~$0.01/1000 |
| Gemini Flash-Lite | 1500 req/day | ~$0.075/1000 |
| D1 | 5M reads/day | $0.001/M reads |
| Workers | 100K req/day | $5/10M req |

**Estimated cost:** $2-5/month for 100K scans.

---

## Deployment

### Worker

```bash
cd worker
npm install
wrangler secret put HF_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

### Custom Domain

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Workers → trash-myx → Settings → Triggers
3. Add Custom Domain → `trash.myx.is`

### PWA on Cloudflare Pages

```bash
npm run build
# Upload dist/ to Pages
```

---

## Links

- [CLAUDE.md](./CLAUDE.md) — Agent guidelines
- [HuggingFace Model](https://huggingface.co/watersplash/waste-classification)
- [SORPA](https://sorpa.is) — Waste management in Reykjavik area
- [2076.is](https://2076.is) — Developer

---

## 💚 Sponsors

This project is supported by:

<table>
  <tr>
    <td align="center" width="200">
      <a href="https://litla.gamaleigan.is">
        <img src="https://litla.gamaleigan.is/logo.svg" width="100" alt="Litla Gámaleigan"><br>
        <strong>Litla Gámaleigan</strong>
      </a>
      <br>
      <sub>Container rental for everyone</sub>
    </td>
    <td align="center" width="200">
      <a href="https://2076.is">
        <img src="https://2076.is/logo.svg" width="100" alt="2076 ehf"><br>
        <strong>2076 ehf</strong>
      </a>
      <br>
      <sub>We solve problems with technology</sub>
    </td>
    <td align="center" width="200">
      <em>Ad Space Available</em>
      <br><br>
      <a href="mailto:omar@2076.is">Contact us</a>
      <br>
      <sub>Support Icelandic recycling</sub>
    </td>
  </tr>
</table>

> Want to sponsor or advertise? [Contact us](mailto:omar@2076.is)

---

## License

MIT © 2076 ehf

---

<p align="center">
  <sub>Developed by <strong>2076 ehf</strong> — we solve problems with technology</sub>
</p>
