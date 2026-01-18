import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'is' | 'en';
export type Region = 'sorpa' | 'kalka' | 'akureyri';

interface Settings {
  language: Language;
  region: Region;
  setLanguage: (lang: Language) => void;
  setRegion: (region: Region) => void;
}

const SettingsContext = createContext<Settings | null>(null);

const REGIONS_INFO = {
  sorpa: { name_is: 'Höfuðborgarsvæðið', name_en: 'Capital Region' },
  kalka: { name_is: 'Suðurnes', name_en: 'Suðurnes' },
  akureyri: { name_is: 'Akureyri', name_en: 'Akureyri' },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('is');
  const [region, setRegionState] = useState<Region>('sorpa');

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('rusl_language') as Language;
      const savedRegion = localStorage.getItem('rusl_region') as Region;

      if (savedLang && (savedLang === 'is' || savedLang === 'en')) {
        setLanguageState(savedLang);
      } else {
        // Auto-detect from browser
        const browserLang = navigator.language.toLowerCase();
        if (!browserLang.startsWith('is')) {
          setLanguageState('en');
        }
      }

      if (savedRegion && savedRegion in REGIONS_INFO) {
        setRegionState(savedRegion);
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

  return (
    <SettingsContext.Provider value={{ language, region, setLanguage, setRegion }}>
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
