import { useSettings, REGIONS_INFO, type Region, type Language } from '../context/SettingsContext';
import { t } from '../locales/translations';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { language, region, setLanguage, setRegion } = useSettings();

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
        <div className="w-8" />
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
              onClick={() => setLanguage('is')}
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
              onClick={() => setLanguage('en')}
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
                onClick={() => setRegion(r.id)}
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
