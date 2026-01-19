# TODO - rusl.myx.is

Verkefnalisti fyrir Íslensku ruslaflokkunarkerfið.

## 🔴 Í vinnslu (In Progress)

### Admin Panel (`/admin`)
- [ ] Búa til `/admin` síðu til að samþykkja myndir fyrir leikinn
- [ ] Sýna allar ósamþykktar myndir í lista
- [ ] Leyfa að samþykkja/hafna myndum
- [ ] Leyfa að breyta flokkun á myndum
- [ ] Bæta við lykilorðsvörn

### Sjálfvirk myndvinnsla (Auto Image Processing)
- [ ] Sjálfvirk klipping á breiðum myndum (auto-crop)
- [ ] Greina marga hluti í sömu mynd (multi-object detection)
- [ ] Bæta við grínkenndum athugasemdum fyrir hluti sem eru ekki rusl

### Leikur (Game Features)
- [ ] Bæta við húmor í svörum fyrir hluti sem eru ekki rusl
- [ ] Skemmtilegri skilaboð fyrir villur og óþekkta hluti

## 🟡 Næst (Up Next)

### API Endurbætur
- [ ] Bæta við endpoint fyrir admin (`/api/admin/images`)
- [ ] Bæta við multi-object response í `/api/identify`
- [ ] Crop suggestion í response

### UX Endurbætur
- [ ] Sýna öll hlutir í breiðri mynd með merkingum
- [ ] Leyfa að velja hlut til að flokka
- [ ] Betri villuskiboð með húmor

## 🟢 Lokið (Completed)

- [x] Grunnkerfi fyrir myndgreiningu
- [x] Quiz leikur með þremur stillingum
- [x] Leaderboard og stigakerfi
- [x] Íslenskar reglur fyrir SORPA
- [x] TTS með íslensku röddum
- [x] PWA stuðningur

## 📋 GitHub Issues Sync

Þessi skrá er samstillt við GitHub issues. Sjá:
- https://github.com/[owner]/rusl.myx.is/issues

Til að búa til issue frá todo:
```bash
gh issue create --title "Admin Panel: Búa til /admin síðu" --body "Sjá TODO.md fyrir upplýsingar"
```

---

Síðast uppfært: 2026-01-19
