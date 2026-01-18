import { useState, useEffect } from 'react';

interface DesktopWrapperProps {
  children: React.ReactNode;
}

export function DesktopWrapper({ children }: DesktopWrapperProps) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On mobile, render app directly
  if (isMobile) {
    return <>{children}</>;
  }

  // On desktop, show landing page with app in phone frame
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex">
      {/* Left side - Info */}
      <div className="flex-1 flex flex-col justify-center p-12 text-white">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold mb-4">
            ♻️ Ruslaflokkun
          </h1>
          <p className="text-xl text-green-200 mb-8">
            Skannaðu rusl og lærðu rétta flokkun með gervigreind
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">📷</span>
              <div>
                <h3 className="font-bold">Skannaðu með myndavél</h3>
                <p className="text-sm text-green-200">Taktu mynd af hvaða hlut sem er</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="font-bold">Gervigreind greinir</h3>
                <p className="text-sm text-green-200">Fáðu svar á sekúndubroti</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4">
              <span className="text-3xl">🎯</span>
              <div>
                <h3 className="font-bold">Rétta tunnuna</h3>
                <p className="text-sm text-green-200">Samkvæmt íslenskum reglum</p>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-4 mb-8">
            <a
              href="#/quiz"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              🎮 Spila leik
            </a>
            <a
              href="#/stats"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold transition-colors"
            >
              📊 Tölfræði
            </a>
          </div>

          {/* Sponsors */}
          <div className="pt-8 border-t border-white/20">
            <p className="text-sm text-green-300 mb-4">Styrktaraðilar:</p>
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
