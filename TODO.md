# TODO - rusl.myx.is

Verkefnalisti fyrir Íslensku ruslaflokkunarkerfið.

## 🟢 Lokið (Completed)

### Admin Panel (`/admin`) ✅
- [x] Búa til `/admin` síðu til að samþykkja myndir fyrir leikinn
- [x] Sýna allar ósamþykktar myndir í lista
- [x] Leyfa að samþykkja/hafna myndum
- [x] Leyfa að breyta flokkun á myndum
- [x] Bæta við lykilorðsvörn
- [x] Batch aðgerðir (samþykkja/hafna mörgum í einu)
- [x] Tölfræðisíða fyrir admin

### Sjálfvirk myndvinnsla (Auto Image Processing) ✅
- [x] Sjálfvirk klipping á breiðum myndum (auto-crop með crop_box)
- [x] Greina marga hluti í sömu mynd (multi-object detection)
- [x] Bæta við grínkenndum athugasemdum fyrir hluti sem eru ekki rusl
- [x] Cartoon stíll með nanó banaba fyrir stærðarsamanburð

### Leikur (Game Features) ✅
- [x] Grínsamir kommentar fyrir hluti sem ekki eru rusl
- [x] Skemmtilegri skilaboð fyrir villur og óþekkta hluti
- [x] Pabba-brandara í svörum

### Grunnkerfi ✅
- [x] Grunnkerfi fyrir myndgreiningu
- [x] Quiz leikur með þremur stillingum
- [x] Leaderboard og stigakerfi
- [x] Íslenskar reglur fyrir SORPA
- [x] TTS með íslensku röddum
- [x] PWA stuðningur

## 🟡 Næst (Up Next)

### UX Endurbætur
- [ ] Sýna öll hlutir í breiðri mynd með merkingum (bounding boxes)
- [ ] Leyfa að velja hlut til að flokka úr lista
- [ ] Betri animation þegar cartoon mode er valið

### Tæknileg vinna
- [ ] Bæta við prófum (unit tests)
- [ ] Performance optimization
- [ ] Offline stuðningur

## 📋 GitHub Issues

Þessi skrá er samstillt við GitHub issues. Til að búa til issue:

```bash
# Búa til issue frá todo
gh issue create --title "Bæta við bounding boxes" --body "Sýna alla greinda hluti með merkingum á myndinni"

# Skoða öll issues
gh issue list
```

## 🛠️ Þróunarskipanir

```bash
# Keyra locally
npm run dev              # Frontend (port 5173)
cd worker && npm run dev # Backend (port 8787)

# Deploy
cd worker && npm run deploy

# Database
npx wrangler d1 execute trash-myx-db --local --command "SELECT * FROM quiz_images WHERE approved = 0"
```

---

Síðast uppfært: 2026-01-19
