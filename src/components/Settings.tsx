import { useSettings, REGIONS_INFO, type Region, type Language } from '../context/SettingsContext';
import { t } from '../locales/translations';
import { haptic } from '../utils/haptics';

interface SettingsProps {
  onClose: () => void;
  onOpenAdmin?: () => void;
}

const TIMER_OPTIONS = [3, 5, 10, 15, 30];

export function Settings({ onClose, onOpenAdmin }: SettingsProps) {
  const { language, region, quizTimer, cartoonMode, setLanguage, setRegion, setQuizTimer, setCartoonMode } = useSettings();

  const regions: { id: Region; name: string }[] = [
    { id: 'sorpa', name: language === 'is' ? REGIONS_INFO.sorpa.name_is : REGIONS_INFO.sorpa.name_en },
    { id: 'kalka', name: language === 'is' ? REGIONS_INFO.kalka.name_is : REGIONS_INFO.kalka.name_en },
    { id: 'akureyri', name: language === 'is' ? REGIONS_INFO.akureyri.name_is : REGIONS_INFO.akureyri.name_en },
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-100 to-gray-200">
      {/* Header */}
      <header className="safe-top bg-gray-700 text-white p-4 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">⚙️ {t('settings.title', language)}</h1>
        {onOpenAdmin ? (
          <button onClick={onOpenAdmin} className="text-xl p-1 opacity-30 hover:opacity-100 transition-opacity">
            🔧
          </button>
        ) : (
          <div className="w-8" />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        {/* Language Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            🌐 {t('settings.language', language)}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                haptic.light();
                setLanguage('is');
              }}
              className={`p-4 rounded-xl font-medium transition-all ${
                language === 'is'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-1">🇮🇸</div>
              <div>Íslenska</div>
            </button>
            <button
              onClick={() => {
                haptic.light();
                setLanguage('en');
              }}
              className={`p-4 rounded-xl font-medium transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="text-2xl mb-1">🇬🇧</div>
              <div>English</div>
            </button>
          </div>
        </div>

        {/* Region Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            📍 {t('settings.region', language)}
          </h2>
          <div className="space-y-2">
            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  haptic.light();
                  setRegion(r.id);
                }}
                className={`w-full p-4 rounded-xl font-medium text-left transition-all flex items-center justify-between ${
                  region === r.id
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{r.name}</span>
                {region === r.id && <span>✓</span>}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {language === 'is'
              ? 'Svæðið ákvarðar hvaða flokkunarreglur eru notaðar'
              : 'Region determines which sorting rules are used'}
          </p>
        </div>

        {/* Quiz Timer */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            ⏱️ {language === 'is' ? 'Tími per spurningu' : 'Time per question'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                onClick={() => {
                  haptic.light();
                  setQuizTimer(seconds);
                }}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  quizTimer === seconds
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-3">
            {language === 'is'
              ? 'Hversu lengi hefur þú til að svara hverri spurningu í quiz'
              : 'How long you have to answer each quiz question'}
          </p>
        </div>

        {/* Cartoon Mode Toggle */}
        <div className="bg-white rounded-2xl p-4 shadow-md mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            🎨 {language === 'is' ? 'Teiknimyndastíll' : 'Cartoon Mode'}
          </h2>
          <button
            onClick={() => {
              haptic.light();
              setCartoonMode(!cartoonMode);
            }}
            className={`w-full p-4 rounded-xl font-medium transition-all flex items-center justify-between ${
              cartoonMode
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              {cartoonMode ? '🌟' : '📷'}
              {language === 'is'
                ? (cartoonMode ? 'Kveikt' : 'Slökkt')
                : (cartoonMode ? 'On' : 'Off')}
            </span>
            <div className={`w-12 h-6 rounded-full transition-all ${cartoonMode ? 'bg-pink-300' : 'bg-gray-300'} relative`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${cartoonMode ? 'right-1' : 'left-1'}`} />
            </div>
          </button>
          <p className="text-sm text-gray-500 mt-3">
            {language === 'is'
              ? 'Sýna skemmtilegar teiknimyndir af hlutum með hreyfingum'
              : 'Show fun cartoon illustrations of items with animations'}
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">
            {language === 'is' ? 'Um appið' : 'About'}
          </h3>
          <p className="text-sm text-blue-700">
            {language === 'is'
              ? 'Ruslaflokkun notar gervigreind til að greina rusl og segja þér í hvaða tunnu það á að fara.'
              : 'Waste Sorting uses AI to identify waste and tell you which bin it belongs in.'}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            v1.3.0 • 2026
          </p>
        </div>
      </main>

      {/* Footer */}
      <div className="safe-bottom bg-gray-200" />
    </div>
  );
}
