import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTranslation } from '../locales/translations';
import { getJokeOfTheDay, type JokeOfTheDay } from '../services/api';

interface DesktopWrapperProps {
  children: React.ReactNode;
}

export function DesktopWrapper({ children }: DesktopWrapperProps) {
  const [isMobile, setIsMobile] = useState(true);
  const [joke, setJoke] = useState<JokeOfTheDay | null>(null);
  const [jokeLoading, setJokeLoading] = useState(true);
  const { language, setLanguage } = useSettings();
  const t = useTranslation(language);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch joke of the day
  useEffect(() => {
    if (!isMobile) {
      getJokeOfTheDay()
        .then(setJoke)
        .catch(console.error)
        .finally(() => setJokeLoading(false));
    }
  }, [isMobile]);

  // On mobile, render app directly
  if (isMobile) {
    return <>{children}</>;
  }

  // On desktop, show landing page with app in phone frame
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLanguage('is')}
          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
            language === 'is'
              ? 'bg-white text-green-900'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          🇮🇸 IS
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
            language === 'en'
              ? 'bg-white text-green-900'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          🇬🇧 EN
        </button>
      </div>

      {/* Left side - Info */}
      <div className="flex-1 flex flex-col justify-center p-12 text-white">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold mb-4">
            ♻️ {t('app.title')}
          </h1>
          <p className="text-xl text-green-200 mb-8">
            {t('desktop.subtitle')}
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">📷</span>
              <div>
                <h3 className="font-bold">{t('desktop.feature1_title')}</h3>
                <p className="text-sm text-green-200">{t('desktop.feature1_desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-bold">{t('desktop.feature2_title')}</h3>
                <p className="text-sm text-green-200">{t('desktop.feature2_desc')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">🎯</span>
              <div>
                <h3 className="font-bold">{t('desktop.feature3_title')}</h3>
                <p className="text-sm text-green-200">{t('desktop.feature3_desc')}</p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-4 mb-8">
            <a
              href="#/quiz"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              🎮 {t('desktop.play_game')}
            </a>
            <a
              href="#/stats"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              📊 {t('desktop.stats')}
            </a>
            <a
              href="#/funfacts"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              💡 Fróðleikur
            </a>
          </div>

          {/* Joke of the Day */}
          <div
            className="mb-8 rounded-xl border border-yellow-400/30 overflow-hidden"
            style={
              joke?.backgroundUrl
                ? {
                    backgroundImage: `url(${joke.backgroundUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div className={joke?.backgroundUrl ? 'bg-black/55 p-4' : 'bg-yellow-500/20 p-4'}>
            <h3 className="font-bold text-yellow-300 mb-2 flex items-center gap-2">
              😂 {t('desktop.joke_title')}
            </h3>
            {jokeLoading ? (
              <p className="text-sm text-green-200 italic">{t('desktop.joke_loading')}</p>
            ) : joke ? (
              <p className="text-white">{joke.joke}</p>
            ) : null}
            </div>
          </div>

          {/* Sponsors */}
          <div className="pt-8 border-t border-white/20">
            <p className="text-sm text-green-300 mb-4">{t('desktop.sponsors')}</p>
            <div className="flex gap-6 items-center">
              <a
                href="https://litlagamaleigan.is"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
              >
                🚛 Litla Gámaleigan
              </a>
              <a
                href="https://2076.is"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white transition-colors"
              >
                🏢 2076 ehf
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Phone mockup */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative">
          {/* Phone frame */}
          <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />

            {/* Screen */}
            <div className="w-[375px] h-[812px] bg-white rounded-[2.5rem] overflow-hidden relative">
              {/* Status bar overlay */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/20 to-transparent z-10 pointer-events-none" />

              {/* App content */}
              <div className="h-full overflow-hidden">
                {children}
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}
