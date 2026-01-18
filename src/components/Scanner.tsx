import { useState, useEffect, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { identifyItem, type IdentifyResponse } from '../services/api';

interface LogEntry {
  id: string;
  timestamp: Date;
  text: string;
  icon: string;
  type: 'info' | 'success' | 'error' | 'pending';
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  image: string;
  item: string;
  bin: string;
  binIcon: string;
  binColor: string;
}

interface ScannerProps {
  onOpenQuiz: () => void;
  onOpenLive: () => void;
  onOpenStats: () => void;
}

export function Scanner({ onOpenQuiz, onOpenLive, onOpenStats }: ScannerProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, captureImage } = useCamera();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentResult, setCurrentResult] = useState<IdentifyResponse | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scan_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((h: any) => ({ ...h, timestamp: new Date(h.timestamp) })));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage (without large images to save space)
  useEffect(() => {
    if (history.length > 0) {
      try {
        // Only save last 10 items, without full images (just metadata)
        const toSave = history.slice(0, 10).map(h => ({
          ...h,
          image: '', // Don't store full images - too much data
        }));
        localStorage.setItem('scan_history', JSON.stringify(toSave));
      } catch (e) {
        console.error('Failed to save history:', e);
        // Clear history if quota exceeded
        localStorage.removeItem('scan_history');
      }
    }
  }, [history]);

  // Start camera
  useEffect(() => {
    startCamera();
    addLog('Myndavél tilbúin', '📷', 'info');
  }, [startCamera]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (text: string, icon: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date(),
      text,
      icon,
      type,
    }]);
  };

  const handleCapture = async () => {
    // Prevent double-clicks while loading
    if (isLoading) return;

    const image = captureImage();
    if (!image) return;

    setCurrentImage(image);
    setCurrentResult(null);
    setIsLoading(true);

    addLog('Mynd tekin', '📸', 'info');
    addLog('Sendi til þjóns...', '📤', 'pending');

    try {
      addLog('Greini með gervigreind...', '🤖', 'pending');
      const response = await identifyItem(image);

      if (response.success) {
        addLog(`Flokkað: ${response.item} → ${response.binInfo?.name_is}`, response.binInfo?.icon || '✅', 'success');

        setCurrentResult(response);

        // Add to history
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          image,
          item: response.item,
          bin: response.binInfo?.name_is || 'Óþekkt',
          binIcon: response.binInfo?.icon || '🗑️',
          binColor: response.binInfo?.color || '#6b7280',
        };
        setHistory(prev => [entry, ...prev]);
      } else {
        addLog(response.error || 'Villa kom upp', '❌', 'error');
      }
    } catch (err) {
      console.error('Scan error:', err);
      addLog('Nettenging mistókst - reyndu aftur', '❌', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scan_history');
    addLog('Saga hreinsuð', '🗑️', 'info');
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <header className="safe-top bg-green-600 text-white p-3 flex items-center justify-between shadow-lg">
        <h1 className="text-lg font-bold">♻️ Ruslaflokkun</h1>
        <div className="flex gap-2">
          <button onClick={onOpenLive} className="text-xl p-1" title="Talandi lýsing">🔊</button>
          <button onClick={onOpenQuiz} className="text-xl p-1" title="Leikur">🎮</button>
          <button onClick={onOpenStats} className="text-xl p-1" title="Tölfræði">📊</button>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-auto">
        {/* Camera section */}
        <div className="relative bg-black" style={{ height: '35vh', minHeight: '200px' }}>
          <canvas ref={canvasRef} className="hidden" />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Scan frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/40 rounded-2xl" />
              </div>
              {/* Capture button */}
              <button
                onClick={handleCapture}
                disabled={!isStreaming || isLoading}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-green-500
                         flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-500" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Current Result */}
        {currentResult && (
          <div
            className="p-4 text-white"
            style={{ backgroundColor: currentResult.binInfo?.color || '#6b7280' }}
          >
            <div className="flex items-center gap-4">
              {currentImage && (
                <img src={currentImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <div className="text-2xl font-bold flex items-center gap-2">
                  {currentResult.binInfo?.icon} {currentResult.item}
                </div>
                <div className="opacity-90">→ {currentResult.binInfo?.name_is}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">+{currentResult.points}</div>
                <div className="text-sm opacity-80">stig</div>
              </div>
            </div>
            {currentResult.reason && (
              <p className="mt-2 text-sm opacity-90">{currentResult.reason}</p>
            )}
          </div>
        )}

        {/* Log section */}
        <div className="bg-gray-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white text-sm font-bold">📋 Log</h2>
            <button
              onClick={() => setLogs([])}
              className="text-gray-400 text-xs hover:text-white"
            >
              Hreinsa
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-2 max-h-32 overflow-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-2">Engin virkni ennþá</div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={`flex items-center gap-2 py-1 ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'pending' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}
                >
                  <span className="text-gray-600 w-16 flex-shrink-0">
                    {log.timestamp.toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span>{log.icon}</span>
                  <span>{log.text}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* History section */}
        <div className="bg-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white text-sm font-bold">📜 Saga ({history.length})</h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-gray-400 text-xs hover:text-white"
              >
                Hreinsa
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-gray-400 text-center py-4 text-sm">
              Engar skannanir ennþá
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="flex-shrink-0 w-24 bg-gray-800 rounded-lg overflow-hidden"
                >
                  <img
                    src={entry.image}
                    alt={entry.item}
                    className="w-full h-16 object-cover"
                  />
                  <div
                    className="p-1 text-white text-center"
                    style={{ backgroundColor: entry.binColor }}
                  >
                    <div className="text-lg">{entry.binIcon}</div>
                    <div className="text-xs truncate">{entry.item}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer safe area */}
      <div className="safe-bottom bg-gray-700" />
    </div>
  );
}
