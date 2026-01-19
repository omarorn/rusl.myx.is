export type Language = 'is' | 'en';

export const translations = {
  // App
  'app.title': { is: 'Ruslaflokkun', en: 'Waste Sorting' },
  'app.subtitle': { is: 'Skannaðu rusl og lærðu rétta flokkun', en: 'Scan waste and learn proper sorting' },

  // Welcome Intro
  'intro.how_it_works': { is: 'Svona virkar þetta:', en: 'How it works:' },
  'intro.step1': { is: 'Taktu mynd af ruslinu', en: 'Take a photo of the waste' },
  'intro.step2': { is: 'Gervigreind greinir hlutinn', en: 'AI identifies the item' },
  'intro.step3': { is: 'Þú sérð í hvaða tunnu það á', en: 'You see which bin it belongs in' },
  'intro.next': { is: 'Áfram', en: 'Next' },
  'intro.bins_title': { is: 'Tunnurnar á Íslandi', en: 'Waste bins in Iceland' },
  'intro.regional_note': { is: 'Ath. flokkun getur verið mismunandi eftir sveitarfélögum', en: 'Note: Sorting rules may vary by municipality' },
  'intro.camera_title': { is: 'Myndavélaaðgangur', en: 'Camera Access' },
  'intro.camera_desc': { is: 'Við þurfum aðgang að myndavélinni til að skanna rusl. Myndir eru aðeins greindar og ekki geymdar.', en: 'We need camera access to scan waste. Images are only analyzed and not stored.' },
  'intro.camera_button': { is: 'Leyfa myndavél', en: 'Allow Camera' },
  'intro.camera_note': { is: 'Þú verður beðinn um leyfi af vafranum', en: 'Your browser will ask for permission' },
  'intro.or_explore': { is: 'Eða skoðaðu:', en: 'Or explore:' },
  'intro.game': { is: 'Leikur', en: 'Game' },
  'intro.stats': { is: 'Tölfræði', en: 'Stats' },
  'intro.sponsor': { is: 'Styrktaraðili', en: 'Sponsor' },

  // Scanner
  'scanner.camera_ready': { is: 'Myndavél tilbúin', en: 'Camera ready' },
  'scanner.photo_taken': { is: 'Mynd tekin', en: 'Photo taken' },
  'scanner.sending': { is: 'Sendi til þjóns...', en: 'Sending to server...' },
  'scanner.analyzing': { is: 'Greini með gervigreind...', en: 'Analyzing with AI...' },
  'scanner.classified': { is: 'Flokkað', en: 'Classified' },
  'scanner.error': { is: 'Villa kom upp', en: 'An error occurred' },
  'scanner.network_error': { is: 'Nettenging mistókst - reyndu aftur', en: 'Network error - try again' },
  'scanner.log': { is: 'Log', en: 'Log' },
  'scanner.clear': { is: 'Hreinsa', en: 'Clear' },
  'scanner.history': { is: 'Saga', en: 'History' },
  'scanner.no_activity': { is: 'Engin virkni ennþá', en: 'No activity yet' },
  'scanner.no_scans': { is: 'Engar skannanir ennþá', en: 'No scans yet' },
  'scanner.points': { is: 'stig', en: 'points' },

  // Quiz
  'quiz.title': { is: 'Ruslaleikur', en: 'Waste Game' },
  'quiz.subtitle': { is: 'Hversu vel þekkir þú ruslið?', en: 'How well do you know waste?' },
  'quiz.choose_mode': { is: 'Veldu leikham og prófaðu þig!', en: 'Choose a mode and test yourself!' },
  'quiz.timed': { is: 'Tímaþröng', en: 'Time Attack' },
  'quiz.timed_desc': { is: '60 sekúndur - hversu mörg nærðu?', en: '60 seconds - how many can you get?' },
  'quiz.survival': { is: 'Þrjú líf', en: 'Three Lives' },
  'quiz.survival_desc': { is: 'Hversu langt kemstu?', en: 'How far can you go?' },
  'quiz.learning': { is: 'Námshamur', en: 'Learning Mode' },
  'quiz.learning_desc': { is: 'Engin tímamörk - lærðu í þínum hraða', en: 'No time limit - learn at your pace' },
  'quiz.which_bin': { is: 'Í hvaða tunnu fer þetta?', en: 'Which bin does this go in?' },
  'quiz.results': { is: 'Úrslit', en: 'Results' },
  'quiz.score': { is: 'stig', en: 'points' },
  'quiz.questions': { is: 'spurningar', en: 'questions' },
  'quiz.correct': { is: 'rétt', en: 'correct' },
  'quiz.play_again': { is: 'Spila aftur', en: 'Play Again' },
  'quiz.choose_mode_btn': { is: 'Velja ham', en: 'Choose Mode' },
  'quiz.next': { is: 'Næsta', en: 'Next' },
  'quiz.pause': { is: 'Staldra', en: 'Pause' },
  'quiz.continue': { is: 'Halda áfram', en: 'Continue' },
  'quiz.streak': { is: 'í röð!', en: 'in a row!' },
  'quiz.leaderboard': { is: 'Stigatafla', en: 'Leaderboard' },
  'quiz.no_images': { is: 'Þú þarft að skanna nokkra hluti fyrst til að byggja upp myndabanka fyrir leikinn!', en: 'You need to scan some items first to build an image library for the game!' },
  'quiz.go_scan': { is: 'Fara að skanna', en: 'Go scan' },

  // Stats
  'stats.title': { is: 'Tölfræði', en: 'Statistics' },
  'stats.your_stats': { is: 'Þínar tölur', en: 'Your Stats' },
  'stats.scans': { is: 'Skannanir', en: 'Scans' },
  'stats.points': { is: 'Stig', en: 'Points' },
  'stats.streak': { is: 'Rás', en: 'Streak' },
  'stats.best_streak': { is: 'Besta rás', en: 'Best Streak' },
  'stats.global': { is: 'Heildaryfirlit', en: 'Global Stats' },
  'stats.total_scans': { is: 'Heildar skannanir', en: 'Total Scans' },
  'stats.total_users': { is: 'Notendur', en: 'Users' },
  'stats.recent': { is: 'Nýleg dæmi', en: 'Recent Examples' },

  // Live Mode
  'live.title': { is: 'Talandi lýsing', en: 'Audio Description' },
  'live.start': { is: 'Ýttu á hnapp til að byrja', en: 'Press button to start' },
  'live.analyzing': { is: 'Greini mynd...', en: 'Analyzing image...' },
  'live.speaking': { is: 'Tala...', en: 'Speaking...' },
  'live.listening': { is: 'Virkt - hlusta...', en: 'Active - listening...' },
  'live.last_desc': { is: 'Síðasta lýsing:', en: 'Last description:' },
  'live.test_audio': { is: 'Prófa hljóð', en: 'Test Audio' },
  'live.loading_voices': { is: 'Hleð röddum...', en: 'Loading voices...' },
  'live.auto_desc': { is: 'Lýsing á 4 sekúndna fresti', en: 'Description every 4 seconds' },
  'live.stop': { is: 'Ýttu á rauða hnappinn til að stoppa', en: 'Press red button to stop' },
  'live.instructions': { is: '🔊 Prófa hljóð • 📷 Stök lýsing • ▶️ Sjálfvirk lýsing', en: '🔊 Test audio • 📷 Single shot • ▶️ Auto describe' },

  // Settings
  'settings.title': { is: 'Stillingar', en: 'Settings' },
  'settings.language': { is: 'Tungumál', en: 'Language' },
  'settings.region': { is: 'Svæði', en: 'Region' },
  'settings.icelandic': { is: 'Íslenska', en: 'Icelandic' },
  'settings.english': { is: 'English', en: 'English' },

  // Bins
  'bin.paper': { is: 'Pappír og pappi', en: 'Paper and cardboard' },
  'bin.plastic': { is: 'Plast- og málmumbúðir', en: 'Plastic and metal packaging' },
  'bin.food': { is: 'Matarleifar', en: 'Food waste' },
  'bin.mixed': { is: 'Blandaður úrgangur', en: 'Mixed waste' },
  'bin.recycling_center': { is: 'Endurvinnslustöð', en: 'Recycling center' },

  // Desktop Landing Page
  'desktop.subtitle': { is: 'Skannaðu rusl og lærðu rétta flokkun með gervigreind', en: 'Scan waste and learn proper sorting with AI' },
  'desktop.feature1_title': { is: 'Skannaðu með myndavél', en: 'Scan with camera' },
  'desktop.feature1_desc': { is: 'Taktu mynd af hvaða hlut sem er', en: 'Take a photo of any item' },
  'desktop.feature2_title': { is: 'Gervigreind greinir', en: 'AI analyzes' },
  'desktop.feature2_desc': { is: 'Fáðu svar á sekúndubroti', en: 'Get an answer in a split second' },
  'desktop.feature3_title': { is: 'Rétta tunnuna', en: 'The right bin' },
  'desktop.feature3_desc': { is: 'Samkvæmt íslenskum reglum', en: 'According to Icelandic rules' },
  'desktop.play_game': { is: 'Spila leik', en: 'Play game' },
  'desktop.stats': { is: 'Tölfræði', en: 'Statistics' },
  'desktop.sponsors': { is: 'Styrktaraðilar:', en: 'Sponsors:' },
  'desktop.joke_title': { is: 'Brandari dagsins', en: 'Joke of the day' },
  'desktop.joke_loading': { is: 'Hleður brandara...', en: 'Loading joke...' },

  // Common
  'common.close': { is: 'Loka', en: 'Close' },
  'common.back': { is: 'Til baka', en: 'Back' },
  'common.save': { is: 'Vista', en: 'Save' },
  'common.cancel': { is: 'Hætta við', en: 'Cancel' },
  'common.loading': { is: 'Hleður...', en: 'Loading...' },
  'common.error': { is: 'Villa', en: 'Error' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language = 'is'): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Missing translation for key: ${key}`);
    return key;
  }
  return translation[lang];
}

// Hook-friendly version
export function useTranslation(lang: Language) {
  return (key: TranslationKey) => t(key, lang);
}
