import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'is' | 'en';
export type Region = 'sorpa' | 'kalka' | 'akureyri';

interface Settings {
  language: Language;
  region: Region;
  quizTimer: number;
  setLanguage: (lang: Language) => void;
  setRegion: (region: Region) => void;
  setQuizTimer: (seconds: number) => void;
}

const SettingsContext = createContext<Settings | null>(null);

const REGIONS_INFO = {
  sorpa: { name_is: 'Höfuðborgarsvæðið', name_en: 'Capital Region' },
  kalka: { name_is: 'Suðurnes', name_en: 'Suðurnes' },
  akureyri: { name_is: 'Akureyri', name_en: 'Akureyri' },
};

// Get default language based on domain
function getDefaultLanguage(): Language {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // trash.myx.is defaults to English, rusl.myx.is defaults to Icelandic
    if (host.startsWith('trash.')) {
      return 'en';
    }
  }
  return 'is'; // Default to Icelandic (rusl.myx.is and localhost)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDefaultLanguage);
  const [region, setRegionState] = useState<Region>('sorpa');
  const [quizTimer, setQuizTimerState] = useState<number>(3);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('rusl_language') as Language;
      const savedRegion = localStorage.getItem('rusl_region') as Region;
      const savedQuizTimer = localStorage.getItem('rusl_quiz_timer');

      if (savedLang && (savedLang === 'is' || savedLang === 'en')) {
        setLanguageState(savedLang);
      }
      // If no saved language, keep domain-based default

      if (savedRegion && savedRegion in REGIONS_INFO) {
        setRegionState(savedRegion);
      }

      if (savedQuizTimer) {
        const timer = parseInt(savedQuizTimer, 10);
        if (timer >= 1 && timer <= 30) {
          setQuizTimerState(timer);
        }
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('rusl_language', lang);
    } catch { /* ignore */ }
  };

  const setRegion = (region: Region) => {
    setRegionState(region);
    try {
      localStorage.setItem('rusl_region', region);
    } catch { /* ignore */ }
  };

  const setQuizTimer = (seconds: number) => {
    setQuizTimerState(seconds);
    try {
      localStorage.setItem('rusl_quiz_timer', String(seconds));
    } catch { /* ignore */ }
  };

  return (
    <SettingsContext.Provider value={{ language, region, quizTimer, setLanguage, setRegion, setQuizTimer }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

export { REGIONS_INFO };
