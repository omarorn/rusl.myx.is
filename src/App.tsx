import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Scanner } from './components/Scanner';
import { WelcomeIntro } from './components/WelcomeIntro';
import { OfflineIndicator } from './components/OfflineIndicator';

// Lazy load components that aren't immediately needed
const Stats = lazy(() => import('./components/Stats').then(m => ({ default: m.Stats })));
const Quiz = lazy(() => import('./components/Quiz').then(m => ({ default: m.Quiz })));
const LiveMode = lazy(() => import('./components/LiveMode').then(m => ({ default: m.LiveMode })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Admin = lazy(() => import('./components/Admin').then(m => ({ default: m.Admin })));
const TripScreen = lazy(() => import('./components/TripScreen').then(m => ({ default: m.TripScreen })));
const FunFacts = lazy(() => import('./components/FunFacts').then(m => ({ default: m.FunFacts })));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70">Hleð...</p>
      </div>
    </div>
  );
}

type View = 'intro' | 'scanner' | 'stats' | 'quiz' | 'live' | 'settings' | 'admin' | 'trip' | 'funfacts';

// Map hash routes to views
const ROUTES: Record<string, View> = {
  '#/intro': 'intro',
  '#/quiz': 'quiz',
  '#/stats': 'stats',
  '#/live': 'live',
  '#/settings': 'settings',
  '#/admin': 'admin',
  '#/trip': 'trip',
  '#/funfacts': 'funfacts',
  '#/': 'scanner',
  '': 'scanner',
};

export default function App() {
  const [view, setView] = useState<View>('intro');
  const [lastRecyclingItem, setLastRecyclingItem] = useState<{ item: string; bin: string; confidence: number } | null>(null);

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
      settings: '#/settings',
      admin: '#/admin',
      trip: '#/trip',
      funfacts: '#/funfacts',
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
          onOpenSettings={() => navigateTo('settings')}
          onOpenTrip={() => navigateTo('trip')}
          onOpenFunFacts={() => navigateTo('funfacts')}
          onRecyclingItem={(item) => {
            // Save item for trip - no auto-navigation
            setLastRecyclingItem(item);
          }}
        />
      )}

      {/* Lazy-loaded components wrapped in Suspense */}
      <Suspense fallback={<LoadingFallback />}>
        {view === 'stats' && <Stats onClose={() => navigateTo('scanner')} />}
        {view === 'quiz' && <Quiz onClose={() => navigateTo('scanner')} />}
        {view === 'live' && <LiveMode onClose={() => navigateTo('scanner')} />}
        {view === 'settings' && <Settings onClose={() => navigateTo('scanner')} onOpenAdmin={() => navigateTo('admin')} />}
        {view === 'admin' && <Admin onClose={() => navigateTo('scanner')} />}
        {view === 'trip' && (
          <TripScreen
            onScanItem={() => navigateTo('scanner')}
            onClose={() => navigateTo('scanner')}
            lastScannedItem={lastRecyclingItem || undefined}
          />
        )}
        {view === 'funfacts' && <FunFacts onClose={() => navigateTo('scanner')} />}
      </Suspense>

      {/* Offline indicator - shown on all views except intro */}
      {view !== 'intro' && (
        <OfflineIndicator
          onSyncComplete={(synced, failed) => {
            console.log(`Synced ${synced} scans, ${failed} failed`);
          }}
        />
      )}
    </div>
  );
}
