import { useState } from 'react';
import { Camera } from './components/Camera';
import { Result } from './components/Result';
import { Stats } from './components/Stats';
import { identifyItem, type IdentifyResponse } from './services/api';

type View = 'camera' | 'result' | 'stats';

export default function App() {
  const [view, setView] = useState<View>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (image: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await identifyItem(image);
      if (response.success) {
        setResult(response);
        setView('result');
      } else {
        setError(response.error || 'Villa kom upp');
      }
    } catch (err) {
      setError('Nettenging mistókst');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setView('camera');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-green-50 to-green-100">
      {/* Header */}
      {view === 'camera' && (
        <header className="safe-top bg-green-600 text-white p-4 flex items-center justify-between shadow-lg">
          <h1 className="text-xl font-bold">♻️ Ruslaflokkun</h1>
          <button onClick={() => setView('stats')} className="text-2xl">📊</button>
        </header>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute top-20 left-4 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'camera' && <Camera onCapture={handleCapture} isLoading={isLoading} />}
        {view === 'result' && result && <Result result={result} onReset={handleReset} />}
        {view === 'stats' && <Stats onClose={() => setView('camera')} />}
      </main>
    </div>
  );
}
