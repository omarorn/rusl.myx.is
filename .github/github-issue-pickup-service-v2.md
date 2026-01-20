# 🚛 Félagasamtök sóttþjónusta og opnunartímar

## Lýsing
Bæta við stuðningi fyrir félagasamtök (eins og Grænir skátar) sem bjóða upp á sóttþjónustu fyrir flöskur/dósir. Einnig sýna opnunartíma og staðsetningar fyrir endurvinnslustaði.

## Bakgrunnur
- **Grænir skátar** og önnur félagasamtök safna flöskum til að fjármagna starfsemi
- Þeir bjóða upp á þrjár tegundir þjónustu: Húsfélög, Söfnunarsambönd, og Söfnunarskápa
- Krumpaðar flöskur valda vandamálum í flöskuskilavélum (vélin stoppar)
- Notendur þurfa að vita hvar næsti söfnunarstaður er

---

## Þjónustutegundir Grænna skáta

### 1. 🏢 Húsfélög
> Við tökum að okkur að sækja flöskur og dósir til húsfélaga og telja þær gegn hluta skilagjaldsins en restin er greidd til húsfélagsins.

**Hvernig virkar það:**
- Grænir skátar koma með söfnunarílát í sorpgeymslu húsfélagsins
- Tæma eftir þörfum
- Íbúar geta skilað flöskum um leið og þeir fara með annan sorp
- Húsfélagið fær hluta af skilagjaldinu

### 2. 🎪 Söfnunarsambönd (fyrir félög og hópa)
> Við bjóðum upp á heildstæða þjónustu þar sem við sækjum dósirnar á söfnunarstað og sjáum um flokkun og talningu gegn þóknun.

**Hvernig virkar það:**
- Félög og hópar safna flöskum/dósum
- Grænir skátar sækja, flokka, og telja gegn þóknun
- Sparar tíma og óþrifnað
- Grænir skátar geta aðstoðað við undirbúning og skipulag söfnunar

### 3. 📦 Söfnunarskápar
Grænir skátar eru með söfnunarskápa á eftirfarandi stöðum:

| Svæði | Staðsetning |
|-------|-------------|
| **Höfuðborgarsvæðið** | Allar grenndarstöðvar |
| **Akureyri** | Grenndarstöð |
| **Reykjanesbær** | Grenndarstöð |
| **Selfoss** | Grenndarstöð |
| **Grímsnes- og Grafningshreppur** | Grenndarstöð |
| **Bláskógabyggð** | Grenndarstöð |

---

## Database Schema

### Ný tafla: `service_types`
```sql
CREATE TABLE service_types (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'husfelag' | 'sofnun' | 'skapur'
  name_is TEXT NOT NULL,
  description_is TEXT,
  how_it_works_is TEXT,
  min_quantity INTEGER,
  fee_description_is TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER,
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);
```

### Ný tafla: `collection_points`
```sql
CREATE TABLE collection_points (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_is TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'sofnunarskapur' | 'grenndarstod' | 'recycling_center' | 'bottle_return'
  region TEXT,                     -- 'hofudborgarsvaedid' | 'akureyri' | 'sudurland' | etc.
  address TEXT,
  lat REAL,
  lng REAL,
  opening_hours TEXT,              -- JSON
  notes_is TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER,
  FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);
```

### Ný tafla: `service_requests`
```sql
CREATE TABLE service_requests (
  id TEXT PRIMARY KEY,
  service_type_id TEXT NOT NULL,
  request_type TEXT NOT NULL,      -- 'husfelag' | 'sofnun' | 'fyrirtaeki'
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  organization_name TEXT,
  address TEXT,
  estimated_quantity INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending',   -- 'pending' | 'contacted' | 'active' | 'completed'
  created_at INTEGER,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);
```

---

## Seed Data: Grænir skátar

### Sponsor
```json
{
  "id": "sponsor_graenir_skatar",
  "name": "Green Scouts Iceland",
  "name_is": "Grænir skátar",
  "logo_url": "/images/sponsors/graenir-skatar.png",
  "website_url": "https://www.scout.is",
  "category": "nonprofit",
  "contact_email": "graenir@scout.is"
}
```

### Þjónustutegundir
```json
[
  {
    "id": "service_husfelag",
    "sponsor_id": "sponsor_graenir_skatar",
    "type": "husfelag",
    "name_is": "Húsfélög",
    "description_is": "Við tökum að okkur að sækja flöskur og dósir til húsfélaga og telja þær gegn hluta skilagjaldsins en restin er greidd til húsfélagsins.",
    "how_it_works_is": "Við komum með viðeigandi söfnunarílát í sorpgeymslu húsfélagsins og tæmum það eftir þörfum. Með þessu gefst íbúum tækifæri til þess að losna við flöskur og dósir um leið og þeir losa sig við aðra flokka sem fara í sorpgeymsluna."
  },
  {
    "id": "service_sofnun",
    "sponsor_id": "sponsor_graenir_skatar",
    "type": "sofnun",
    "name_is": "Söfnunarsambönd",
    "description_is": "Við bjóðum upp á heildstæða þjónustu þar sem við sækjum dósirnar á söfnunarstað og sjáum um flokkun og talningu gegn þóknun.",
    "how_it_works_is": "Með þessu sparast mikill tími og óþrifnaður og félög og hópar geta einbeitt sér að söfnuninni sjálfri. Grænir skátar bjóða upp á aðstoða við undirbúning og skipulag söfnunar."
  },
  {
    "id": "service_skapur",
    "sponsor_id": "sponsor_graenir_skatar",
    "type": "skapur",
    "name_is": "Söfnunarskápar",
    "description_is": "Grænir skátar eru með söfnunarskápa á grenndarstöðvum víðsvegar um landið."
  }
]
```

### Söfnunarskápar staðsetningar
```json
[
  {
    "id": "cp_rvk_grafarvogur",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Grafarvogs",
    "name_is": "Grenndarstöð Grafarvogs",
    "type": "sofnunarskapur",
    "region": "hofudborgarsvaedid",
    "address": "Grafarvogur, Reykjavík"
  },
  {
    "id": "cp_rvk_breidholt",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Breiðholts",
    "name_is": "Grenndarstöð Breiðholts",
    "type": "sofnunarskapur",
    "region": "hofudborgarsvaedid",
    "address": "Breiðholt, Reykjavík"
  },
  {
    "id": "cp_akureyri",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Akureyrar",
    "name_is": "Grenndarstöð Akureyrar",
    "type": "sofnunarskapur",
    "region": "akureyri",
    "address": "Akureyri"
  },
  {
    "id": "cp_reykjanesbaer",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Reykjanesbæjar",
    "name_is": "Grenndarstöð Reykjanesbæjar",
    "type": "sofnunarskapur",
    "region": "sudurnes",
    "address": "Reykjanesbær"
  },
  {
    "id": "cp_selfoss",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Selfoss",
    "name_is": "Grenndarstöð Selfoss",
    "type": "sofnunarskapur",
    "region": "sudurland",
    "address": "Selfoss"
  },
  {
    "id": "cp_grimsnes",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Grímsnes",
    "name_is": "Grenndarstöð Grímsnes- og Grafningshrepps",
    "type": "sofnunarskapur",
    "region": "sudurland",
    "address": "Grímsnes- og Grafningshreppur"
  },
  {
    "id": "cp_blaskogabyggd",
    "sponsor_id": "sponsor_graenir_skatar",
    "name": "Grenndarstöð Bláskógabyggðar",
    "name_is": "Grenndarstöð Bláskógabyggðar",
    "type": "sofnunarskapur",
    "region": "sudurland",
    "address": "Bláskógabyggð"
  }
]
```

---

## UI Breytingar

### 1. 🗺️ Nýr "Staðsetningar" flipi
- Kort með söfnunarskápum og endurvinnslusstöðum
- Sía eftir svæði og tegund
- Sýna opnunartíma og leiðbeiningar

### 2. 📝 "Þjónusta" hluti
Þrír valmöguleikar fyrir Græna skáta:

```
┌─────────────────────────────────────────────┐
│  🏢 Húsfélög                                │
│  Fáðu söfnunarílát í sorpgeymsluna          │
│  [Sækja um þjónustu]                        │
├─────────────────────────────────────────────┤
│  🎪 Söfnunarsambönd                         │
│  Við sækjum, teljum og flokkum              │
│  [Skipuleggja söfnun]                       │
├─────────────────────────────────────────────┤
│  📦 Söfnunarskápar                          │
│  Finndu næsta skáp                          │
│  [Skoða kort]                               │
└─────────────────────────────────────────────┘
```

### 3. 💡 Skilagjaldstips í Scanner
Þegar flokkað er sem "skilagjald":
```
┌─────────────────────────────────────────────┐
│  💡 Ábending                                │
│  Ekki krumpa flöskuna! Vélin þarf að        │
│  lesa strikamerkið.                         │
│                                             │
│  🌲 Grænir skátar sækja flöskur             │
│  [Skoða þjónustu]                           │
└─────────────────────────────────────────────┘
```

---

## API Endpoints

### GET /api/services
```
?sponsor_id=sponsor_graenir_skatar
?type=husfelag|sofnun|skapur
```

### GET /api/collection-points
```
?region=hofudborgarsvaedid
?type=sofnunarskapur
?near=64.1466,-21.8461&radius=10km
```

### POST /api/service-requests
```json
{
  "service_type_id": "service_husfelag",
  "request_type": "husfelag",
  "contact_name": "Jón Jónsson",
  "contact_email": "jon@husfelag.is",
  "contact_phone": "555-1234",
  "organization_name": "Húsfélagið Sólborg",
  "address": "Sólvangur 10-20, 104 Reykjavík",
  "estimated_quantity": 100,
  "notes": "Við erum 20 íbúðir, mikil umferð"
}
```

---

## Verkefnalisti

### Backend
- [ ] Migration `0005_services_locations.sql`
- [ ] Seed data fyrir Græna skáta
- [ ] Routes: `/api/services`, `/api/collection-points`, `/api/service-requests`
- [ ] Email notification þegar beiðni berst

### Frontend
- [ ] Staðsetningar flipi með korti (Mapbox)
- [ ] Þjónustusíða með bókunarformi
- [ ] Skilagjaldstips í Scanner
- [ ] Næsti söfnunarskápur widget

### Data
- [ ] Sækja nákvæmar staðsetningar grenndarstöðva
- [ ] Bæta við fleiri svæðum (Vestfirðir, Austurland, etc.)
- [ ] Opnunartímar fyrir hverja stöð

---

## Tenglar
- [Grænir skátar - Sækja](https://www.scout.is/saekja)
- [SORPA grenndarstöðvar](https://sorpa.is/grenndarstodvar)
- [Endurvinnslan stöðvar](https://endurvinnslan.is/stodvar)

## Labels
`enhancement`, `feature`, `database`, `frontend`, `backend`, `nonprofit`
