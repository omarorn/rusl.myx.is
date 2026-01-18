import { useState } from 'react';
import { Scanner } from './components/Scanner';
import { Stats } from './components/Stats';
import { Quiz } from './components/Quiz';
import { LiveMode } from './components/LiveMode';

type View = 'scanner' | 'stats' | 'quiz' | 'live';

export default function App() {
  const [view, setView] = useState<View>('scanner');

  return (
    <div className="h-full flex flex-col">
      {view === 'scanner' && (
        <Scanner
          onOpenQuiz={() => setView('quiz')}
          onOpenLive={() => setView('live')}
          onOpenStats={() => setView('stats')}
        />
      )}
      {view === 'stats' && <Stats onClose={() => setView('scanner')} />}
      {view === 'quiz' && <Quiz onClose={() => setView('scanner')} />}
      {view === 'live' && <LiveMode onClose={() => setView('scanner')} />}
    </div>
  );
}
