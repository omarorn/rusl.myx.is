# TODO - rusl.myx.is

Verkefnalisti fyrir Íslensku ruslaflokkunarkerfið.

## 🟢 Lokið (Completed)

### v1.5.x (2026-01-29) ✅
- [x] Endurnýja Fróðleik (FunFacts) sem feed úr `quiz_images` (≈110 approved)
- [x] Sýna ikon sjálfgefið og leyfa að skipta yfir í upprunalega mynd (smella/toggle)
- [x] Styðja R2 lykla fyrir ikon/jokes bæði með og án `quiz/` forskeytis í `/api/quiz/image/*`
- [x] Brandari dagsins: sýna bakgrunn á desktop landing og tryggja `backgroundUrl` í `/api/stats/joke`
- [x] Desktop: bæta við hlekk á Fróðleik við hliðina á Tölfræði
- [x] "Rangt?" sendir ekki email — flaggar í D1 fyrir yfirferð (`POST /api/review/flag`)
- [x] Endurnefna app titil/haus: "Ruslaflokkun" → "Trasshy"

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

### Quiz Timer (v1.3.0) ✅
- [x] Per-question timer í stað game timer
- [x] Stillanlegt: 3, 5, 10, 15, 30 sekúndur
- [x] Sjálfgefið 3 sekúndur
- [x] Timeout telst sem rangt svar
- [x] Timer UI í Settings

### Multi-Domain & Tungumál (v1.3.0) ✅
- [x] rusl.myx.is → Íslenska sjálfgefið
- [x] trash.myx.is → Enska sjálfgefið
- [x] wrangler.toml með báðum lénum
- [x] CORS stuðningur fyrir bæði lén

### Íslensk Málfræði (v1.3.0) ✅
- [x] Endurbættar AI prompts með réttum fallbeygingum
- [x] icelandic-reviewer agent búið til
- [x] icelandic-grammar skill búið til
- [x] Icelandic Morphology MCP þjónn stilltur
- [x] CLAUDE.md uppfært með málfræðikafla

### Unit Tests (v1.3.1) ✅
- [x] Vitest uppsett með Node environment
- [x] 28 unit tests fyrir iceland-rules.ts
- [x] Próf fyrir bin mapping, overrides, og Ísland-sértækar reglur
- [x] Lagaður villa í checkOverrides (word boundary fyrir pla, abs, petg)
- [x] Próf keyra með `npm test` eða `npm run test:watch`

### Cartoon Mode Animation (v1.3.2) ✅
- [x] CSS keyframe animations (fadeIn, popIn, slideUp)
- [x] Cartoon mode toggle í Settings
- [x] cartoonMode vistuð í localStorage
- [x] Smooth transitions á myndum í Scanner

### Object Selection (v1.3.2) ✅
- [x] Keyboard navigation (örvar til að velja, Enter til að klippa)
- [x] Undo functionality (Ctrl+Z og ↩️ hnappur)
- [x] Image history stack (geymir síðustu 5 stöður)
- [x] Escape til að loka lista
- [x] Keyboard hint texti í UI

### Bounding Boxes (v1.3.2) ✅
- [x] Fullscreen bounding box view með öllum hlutum
- [x] Bin-based color coding (blátt=pappír, grænt=plast, o.s.frv.)
- [x] Index numbers fyrir multi-object scenes
- [x] Improved label styling með emojis
- [x] Click-to-select í fullscreen view
- [x] 🔍 Stækka hnappur til að opna fullscreen view

### Offline Support (v1.3.2) ✅
- [x] IndexedDB-based offline queue fyrir skannirnar
- [x] Workbox runtime caching strategies
- [x] OfflineIndicator component sem sýnir stöðu
- [x] Auto-sync þegar nettenging kemur aftur
- [x] Cache-first fyrir quiz myndir
- [x] Network-first fyrir stats og leaderboard

### Performance Optimization (v1.3.2) ✅
- [x] Code splitting með React.lazy() - 20% minni initial bundle
- [x] Lazy loading fyrir Quiz, Stats, Settings, Admin, TripScreen, LiveMode
- [x] Suspense með loading fallback
- [x] Image lazy loading í history section
- [x] Main bundle: 251KB → 202KB

### v1.4.0 Features ✅
- [x] Leaderboard með vikulegum/mánaðarlegum töflum (period selector)
- [x] Share function til að deila niðurstöðum (Web Share API)
- [x] Haptic feedback á iOS/Android (Vibration API)
- [x] Gemini 2.5 Flash TTS fyrir talgervi

## 🟡 Næst (Up Next)

### Yfirferð & gæði
- [ ] Admin UI: skoða/afgreiða `review_flags` (listi + status: new/triaged/resolved)
- [ ] Auka ikon coverage: keyra batch "generate missing icons" þar til nær 100%
- [ ] Rannsaka "Óþekkt hlutur"/unknown-item í skönnun (betri fallback + logging)

### Framtíðar hugmyndir
- [ ] Multi-language TTS rödd val
- [ ] Push notifications fyrir dagleg áminning

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

Síðast uppfært: 2026-01-29
