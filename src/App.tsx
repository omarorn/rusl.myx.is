import { useState, useEffect, useCallback } from 'react';
import { Scanner } from './components/Scanner';
import { Stats } from './components/Stats';
import { Quiz } from './components/Quiz';
import { LiveMode } from './components/LiveMode';
import { WelcomeIntro } from './components/WelcomeIntro';

type View = 'intro' | 'scanner' | 'stats' | 'quiz' | 'live';

// Map hash routes to views
const ROUTES: Record<string, View> = {
  '#/intro': 'intro',
  '#/quiz': 'quiz',
  '#/stats': 'stats',
  '#/live': 'live',
  '#/': 'scanner',
  '': 'scanner',
};

export default function App() {
  const [view, setView] = useState<View>('intro');

  // Handle hash-based routing
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash;
    const route = ROUTES[hash];

    if (route) {
      // Direct link to a specific view
      if (route !== 'intro') {
        try {
          localStorage.setItem('rusl_intro_seen', 'true');
        } catch { /* ignore */ }
      }
      setView(route);
    } else {
      // No hash or unknown hash - check intro status
      try {
        const seen = localStorage.getItem('rusl_intro_seen');
        if (seen === 'true') {
          setView('scanner');
        } else {
          setView('intro');
        }
      } catch {
        setView('intro');
      }
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  // Update hash when view changes
  const navigateTo = useCallback((newView: View) => {
    const hashMap: Record<View, string> = {
      intro: '#/intro',
      scanner: '#/',
      quiz: '#/quiz',
      stats: '#/stats',
      live: '#/live',
    };
    window.location.hash = hashMap[newView];
    setView(newView);
  }, []);

  const handleIntroComplete = () => {
    try {
      localStorage.setItem('rusl_intro_seen', 'true');
    } catch {
      // Ignore storage errors
    }
    navigateTo('scanner');
  };

  return (
    <div className="h-full flex flex-col">
      {view === 'intro' && <WelcomeIntro onComplete={handleIntroComplete} />}
      {view === 'scanner' && (
        <Scanner
          onOpenQuiz={() => navigateTo('quiz')}
          onOpenLive={() => navigateTo('live')}
          onOpenStats={() => navigateTo('stats')}
        />
      )}
      {view === 'stats' && <Stats onClose={() => navigateTo('scanner')} />}
      {view === 'quiz' && <Quiz onClose={() => navigateTo('scanner')} />}
      {view === 'live' && <LiveMode onClose={() => navigateTo('scanner')} />}
    </div>
  );
}
