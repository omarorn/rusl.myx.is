import { useState } from 'react';

interface WelcomeIntroProps {
  onComplete: () => void;
}

const BINS = [
  {
    name: 'Pappír og pappi',
    icon: '📄',
    color: '#2563eb',
    items: 'Kassar, dagblöð, pappírsumbúðir, TetraPak',
  },
  {
    name: 'Plast- og málmumbúðir',
    icon: '🧴',
    color: '#16a34a',
    items: 'Plastflöskur, dósir, málmlok, álpappír',
  },
  {
    name: 'Matarleifar',
    icon: '🍎',
    color: '#92400e',
    items: 'Ávextir, grænmeti, matarúrgangur',
  },
  {
    name: 'Blandaður úrgangur',
    icon: '🗑️',
    color: '#6b7280',
    items: '3D-plast, lífplast, mengaður pappír',
  },
  {
    name: 'Endurvinnslustöð',
    icon: '♻️',
    color: '#7c3aed',
    items: 'Gler, rafhlöður, frauðplast, fatnaður',
  },
];

export function WelcomeIntro({ onComplete }: WelcomeIntroProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-green-600 to-green-800 text-white">
      {/* Safe area top */}
      <div className="safe-top" />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        {step === 0 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-4">♻️</div>
            <h1 className="text-3xl font-bold mb-2">Trasshy</h1>
            <p className="text-lg opacity-90 mb-6">
              Skannaðu rusl og lærðu rétta flokkun
            </p>
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left max-w-xs">
              <h2 className="font-bold mb-2 text-center">Svona virkar þetta:</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📷</span>
                  <span>Taktu mynd af ruslinu</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <span>Gervigreind greinir hlutinn</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <span>Þú sérð í hvaða tunnu það á</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="bg-white text-green-700 font-bold py-3 px-8 rounded-full text-lg shadow-lg active:scale-95 transition-transform"
            >
              Áfram →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="text-center animate-fade-in w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-4">Tunnurnar á Íslandi</h2>
            <div className="space-y-2 mb-6">
              {BINS.map((bin) => (
                <div
                  key={bin.name}
                  className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                  style={{ borderLeft: `4px solid ${bin.color}` }}
                >
                  <span className="text-2xl">{bin.icon}</span>
                  <div className="text-left">
                    <div className="font-bold">{bin.name}</div>
                    <div className="text-xs opacity-80">{bin.items}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm opacity-80 mb-4">
              Ath. flokkun getur verið mismunandi eftir sveitarfélögum
            </p>
            <button
              onClick={() => setStep(2)}
              className="bg-white text-green-700 font-bold py-3 px-8 rounded-full text-lg shadow-lg active:scale-95 transition-transform"
            >
              Áfram →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-4">📷</div>
            <h2 className="text-2xl font-bold mb-4">Myndavélaaðgangur</h2>
            <p className="opacity-90 mb-6 max-w-xs">
              Við þurfum aðgang að myndavélinni til að skanna rusl.
              Myndir eru aðeins greindar og ekki geymdar.
            </p>
            <button
              onClick={onComplete}
              className="bg-white text-green-700 font-bold py-3 px-8 rounded-full text-lg shadow-lg active:scale-95 transition-transform"
            >
              Leyfa myndavél 📷
            </button>
            <p className="text-xs opacity-60 mt-4 max-w-xs">
              Þú verður beðinn um leyfi af vafranum
            </p>

            {/* Quick links */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm opacity-70 mb-3">Eða skoðaðu:</p>
              <div className="flex justify-center gap-4">
                <a
                  href="#/quiz"
                  className="flex flex-col items-center text-white/80 hover:text-white p-2"
                >
                  <span className="text-2xl">🎮</span>
                  <span className="text-xs">Leikur</span>
                </a>
                <a
                  href="#/stats"
                  className="flex flex-col items-center text-white/80 hover:text-white p-2"
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-xs">Tölfræði</span>
                </a>
                <button
                  onClick={() => {
                    const shareUrl = 'https://trash.myx.is/#/intro';
                    const shareData = {
                      title: 'Ruslaflokkun - trash.myx.is',
                      text: 'Skannaðu rusl og lærðu rétta flokkun með gervigreind!',
                      url: shareUrl,
                    };
                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Hlekkur afritaður!');
                    }
                  }}
                  className="flex flex-col items-center text-white/80 hover:text-white p-2"
                >
                  <span className="text-2xl">📤</span>
                  <span className="text-xs">Deila</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-4">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              step === i ? 'bg-white w-4' : 'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Safe area bottom */}
      <div className="safe-bottom" />
    </div>
  );
}
