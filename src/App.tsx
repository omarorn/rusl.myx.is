import { useState } from 'react';
import { Camera } from './components/Camera';
import { Result } from './components/Result';
import { Stats } from './components/Stats';
import { Quiz } from './components/Quiz';
import { identifyItem, type IdentifyResponse } from './services/api';

type View = 'camera' | 'result' | 'stats' | 'quiz';

export type ThinkingStep = {
  id: string;
  text: string;
  icon: string;
  done: boolean;
};

const THINKING_STEPS: Omit<ThinkingStep, 'done'>[] = [
  { id: 'capture', text: 'Tók mynd...', icon: '📸' },
  { id: 'upload', text: 'Sendi til þjóns...', icon: '📤' },
  { id: 'ai', text: 'Greini með gervigreind...', icon: '🤖' },
  { id: 'rules', text: 'Beiti íslenskum reglum...', icon: '🇮🇸' },
  { id: 'done', text: 'Tilbúið!', icon: '✅' },
];

export default function App() {
  const [view, setView] = useState<View>('camera');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStep = (stepId: string) => {
    console.log(`[Rusl] ${stepId}`);
    setThinkingSteps(prev => {
      const stepIndex = THINKING_STEPS.findIndex(s => s.id === stepId);
      return THINKING_STEPS.slice(0, stepIndex + 1).map((s, i) => ({
        ...s,
        done: i < stepIndex,
      }));
    });
  };

  const handleCapture = async (image: string) => {
    setIsLoading(true);
    setError(null);
    setThinkingSteps([]);

    try {
      updateStep('capture');
      console.log('[Rusl] Image captured, size:', Math.round(image.length / 1024), 'KB');

      await new Promise(r => setTimeout(r, 300)); // Brief pause for UX
      updateStep('upload');

      await new Promise(r => setTimeout(r, 200));
      updateStep('ai');

      const response = await identifyItem(image);
      console.log('[Rusl] API response:', response);

      updateStep('rules');
      await new Promise(r => setTimeout(r, 300));

      if (response.success) {
        updateStep('done');
        console.log('[Rusl] Classification:', response.item, '→', response.bin);
        await new Promise(r => setTimeout(r, 500));
        setResult(response);
        setView('result');
      } else {
        setError(response.error || 'Villa kom upp');
      }
    } catch (err) {
      console.error('[Rusl] Error:', err);
      setError('Nettenging mistókst');
    } finally {
      setIsLoading(false);
      setThinkingSteps([]);
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
          <div className="flex gap-3">
            <button onClick={() => setView('quiz')} className="text-2xl">🎮</button>
            <button onClick={() => setView('stats')} className="text-2xl">📊</button>
          </div>
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
        {view === 'camera' && <Camera onCapture={handleCapture} isLoading={isLoading} thinkingSteps={thinkingSteps} />}
        {view === 'result' && result && <Result result={result} onReset={handleReset} />}
        {view === 'stats' && <Stats onClose={() => setView('camera')} />}
      </main>
    </div>
  );
}
