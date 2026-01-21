import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { identifyItem, generateCartoon, type IdentifyResponse, type DetectedObject } from '../services/api';
import { AdSlot } from './AdSlot';
import { cropImageClient, drawCropOverlay } from '../utils/imageUtils';

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

// Nano banana for scale - the ultimate size reference
const NANO_BANANA = '🍌';
const BANANA_COMMENTS = [
  'Banani fyrir stærðarsamanburð',
  'Staðlað mælibanani',
  'Alþjóðlegt bananamælikerfi',
  'Banani til viðmiðunar',
];

interface ScannerProps {
  onOpenQuiz: () => void;
  onOpenLive: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenTrip?: () => void;
}

export function Scanner({ onOpenQuiz, onOpenLive, onOpenStats, onOpenSettings, onOpenTrip }: ScannerProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, captureImage } = useCamera();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentResult, setCurrentResult] = useState<IdentifyResponse | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [isGeneratingCartoon, setIsGeneratingCartoon] = useState(false);
  const [showCartoon, setShowCartoon] = useState(true);  // Cartoon mode as default
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Apply cartoon effect to image (fallback CSS filter if AI cartoon not available)
  const getCartoonStyle = useCallback(() => {
    if (!showCartoon || cartoonImage) return {};
    return {
      filter: 'contrast(1.3) saturate(1.4) brightness(1.1)',
      borderRadius: '16px',
    };
  }, [showCartoon, cartoonImage]);

  // Get random banana comment
  const getBananaComment = useCallback(() => {
    return BANANA_COMMENTS[Math.floor(Math.random() * BANANA_COMMENTS.length)];
  }, []);

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
    if (!image) {
      addLog('Gat ekki tekið mynd - reyndu aftur', '❌', 'error');
      return;
    }

    // Check if image is too small (likely black/empty)
    if (image.length < 5000) {
      addLog('Mynd of lítil - bíddu eftir myndavél', '⚠️', 'error');
      return;
    }

    setCurrentImage(image);
    setOverlayImage(null);
    setCartoonImage(null);
    setCurrentResult(null);
    setSelectedObjectIndex(0);
    setIsLoading(true);

    addLog('Mynd tekin', '📸', 'info');
    addLog('Sendi til þjóns...', '📤', 'pending');

    try {
      addLog('Greini með gervigreind...', '🤖', 'pending');
      const response = await identifyItem(image);

      if (response.success) {
        // Check if it's actually a failed identification (0% confidence)
        if (response.confidence === 0 || response.item === 'Óþekkt hlutur') {
          addLog('Gat ekki greint hlut', '🤔', 'error');
          addLog('Prófaðu að taka skýrari mynd', '📷', 'info');
          setCurrentResult(response);
          setIsLoading(false);
          return;
        }

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

        // Generate overlay for wide shots with multiple objects
        if (response.isWideShot && response.allObjects && response.allObjects.length > 1) {
          addLog(`${response.allObjects.length} hlutir greindir`, '🔍', 'info');
          drawCropOverlay(image, response.allObjects, 0)
            .then(overlay => {
              setOverlayImage(overlay);
            })
            .catch(err => {
              console.error('Failed to draw overlay:', err);
            });
        }

        // Generate AI cartoon in background
        if (showCartoon) {
          setIsGeneratingCartoon(true);
          addLog('Bý til teiknimynd...', '🎨', 'pending');
          generateCartoon(image, 'cute')
            .then(cartoonResponse => {
              if (cartoonResponse.success && cartoonResponse.cartoonImage) {
                setCartoonImage(cartoonResponse.cartoonImage);
                addLog('Teiknimynd tilbúin!', '✨', 'success');
              } else {
                addLog('Notum CSS síu í staðinn', '🎨', 'info');
              }
            })
            .catch(() => {
              addLog('Notum CSS síu í staðinn', '🎨', 'info');
            })
            .finally(() => {
              setIsGeneratingCartoon(false);
            });
        }
      } else {
        // Better error messages based on error type
        const errorMsg = response.error || 'Villa kom upp';
        if (errorMsg.includes('ekki tiltæk') || errorMsg.includes('quota') || errorMsg.includes('429')) {
          addLog('AI þjónusta ekki tiltæk', '⚠️', 'error');
          addLog('Reyndu aftur eftir smá stund', '⏳', 'info');
        } else if (response.item === 'Óþekkt hlutur') {
          addLog('Gat ekki greint hlut', '🤔', 'error');
          addLog('Prófaðu að taka skýrari mynd', '📷', 'info');
        } else {
          addLog(errorMsg, '❌', 'error');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      addLog('Nettenging mistókst', '📡', 'error');
      addLog('Athugaðu nettengingu og reyndu aftur', '🔄', 'info');
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
      {/* Development Banner */}
      <div className="bg-yellow-500 text-yellow-900 text-center text-xs py-1 font-medium">
        🚧 Þetta app er í þróun — villur geta komið upp
      </div>

      {/* Header */}
      <header className="safe-top bg-green-600 text-white p-3 flex items-center justify-between shadow-lg">
        <h1 className="text-lg font-bold">♻️ Ruslaflokkun</h1>
        <div className="flex gap-2">
          <button onClick={onOpenLive} className="text-xl p-1" title="Talandi lýsing">🔊</button>
          <button onClick={onOpenQuiz} className="text-xl p-1" title="Leikur">🎮</button>
          <button onClick={onOpenStats} className="text-xl p-1" title="Tölfræði">📊</button>
          {onOpenTrip && <button onClick={onOpenTrip} className="text-xl p-1" title="Ferð">🚗</button>}
          <button onClick={onOpenSettings} className="text-xl p-1" title="Stillingar">⚙️</button>
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
            style={{ backgroundColor: currentResult.confidence === 0 ? '#dc2626' : (currentResult.binInfo?.color || '#6b7280') }}
          >
            {/* Image with cartoon effect and nano banana */}
            <div className="flex items-start gap-4 mb-3">
              {currentImage && (
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      showCartoon && cartoonImage
                        ? cartoonImage
                        : (currentResult?.isWideShot && overlayImage)
                          ? overlayImage
                          : currentImage
                    }
                    alt=""
                    className="w-20 h-20 object-cover shadow-lg rounded-2xl"
                    style={getCartoonStyle()}
                  />
                  {/* Loading indicator for cartoon generation */}
                  {isGeneratingCartoon && showCartoon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {/* Wide shot indicator */}
                  {currentResult?.isWideShot && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded">
                      {currentResult.allObjects?.length || 0}
                    </div>
                  )}
                  {/* Nano banana for scale */}
                  {showCartoon && (
                    <div
                      className="absolute -bottom-1 -right-1 text-2xl drop-shadow-lg animate-bounce"
                      title={getBananaComment()}
                    >
                      {NANO_BANANA}
                    </div>
                  )}
                  {/* Toggle button */}
                  <button
                    onClick={() => setShowCartoon(!showCartoon)}
                    className="absolute -top-1 -left-1 w-6 h-6 bg-black/50 rounded-full text-xs flex items-center justify-center"
                    title={showCartoon ? 'Sýna frummynd' : 'Sýna teiknimynd'}
                  >
                    {showCartoon ? '📷' : '🎨'}
                  </button>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                  {currentResult.binInfo?.icon} {currentResult.item}
                </div>
                <div className="opacity-90">→ {currentResult.binInfo?.name_is}</div>
                {currentResult.confidence && (
                  <div className="text-xs opacity-70 mt-1">
                    {Math.round(currentResult.confidence * 100)}% viss
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold">+{currentResult.points}</div>
                <div className="text-sm opacity-80">stig</div>
              </div>
            </div>

            {currentResult.reason && (
              <p className="text-sm opacity-90 mb-2">{currentResult.reason}</p>
            )}

            {/* Dad joke / fun fact */}
            {(currentResult.funFact || currentResult.dadJoke) && (
              <div className="bg-white/10 rounded-lg p-2 mb-2 text-sm">
                <span className="opacity-70">💡 </span>
                {currentResult.dadJoke || currentResult.funFact}
              </div>
            )}

            {/* Funny comments for non-trash objects */}
            {currentResult.funnyComments && currentResult.funnyComments.length > 0 && (
              <div className="bg-yellow-500/20 rounded-lg p-2 mb-2">
                <div className="text-xs font-bold mb-1 opacity-80">😄 Grín á myndinni:</div>
                {currentResult.funnyComments.map((comment, i) => (
                  <p key={i} className="text-sm">{comment}</p>
                ))}
              </div>
            )}

            {/* Multi-object detection for wide shots */}
            {currentResult.isWideShot && currentResult.allObjects && currentResult.allObjects.length > 1 && (
              <div className="mb-2">
                <button
                  onClick={() => setShowAllObjects(!showAllObjects)}
                  className="w-full py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
                >
                  {showAllObjects ? '▲' : '▼'} {currentResult.allObjects.length} hlutir greindir
                </button>
                {showAllObjects && (
                  <div className="mt-2 space-y-1">
                    {currentResult.allObjects.map((obj, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          setSelectedObjectIndex(i);
                          // Update overlay to highlight selected object
                          if (currentImage && currentResult.allObjects) {
                            const overlay = await drawCropOverlay(currentImage, currentResult.allObjects, i);
                            setOverlayImage(overlay);
                          }
                          // If object has crop_box, crop to it
                          if (obj.crop_box && currentImage) {
                            addLog(`Klippi að: ${obj.item}`, '✂️', 'info');
                            try {
                              const cropped = await cropImageClient(currentImage, obj.crop_box);
                              setCurrentImage(cropped);
                              setOverlayImage(null);
                            } catch (err) {
                              console.error('Crop failed:', err);
                            }
                          }
                        }}
                        className={`w-full p-2 rounded text-sm text-left transition-colors ${
                          i === selectedObjectIndex
                            ? 'bg-white/20 ring-2 ring-white/50'
                            : obj.is_trash ? 'bg-white/10 hover:bg-white/15' : 'bg-white/5 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            {i === selectedObjectIndex ? '✓ ' : ''}
                            {obj.is_trash ? '🗑️' : '👀'} {obj.item}
                          </span>
                          <span className="text-xs opacity-70">{obj.bin}</span>
                        </div>
                        {obj.funny_comment && (
                          <p className="text-xs opacity-70 mt-1 italic">"{obj.funny_comment}"</p>
                        )}
                        {obj.crop_box && (
                          <p className="text-xs opacity-50 mt-1">📐 Smelltu til að klippa</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Feedback button */}
            <button
              onClick={() => {
                const feedback = `Hlutur: ${currentResult.item}\nTunna: ${currentResult.binInfo?.name_is}\nÁstæða: ${currentResult.reason}`;
                const mailtoUrl = `mailto:rusl@myx.is?subject=Rangt flokkað&body=${encodeURIComponent(feedback)}`;
                window.open(mailtoUrl, '_blank');
              }}
              className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              🤔 Ég held þetta sé rangt
            </button>
          </div>
        )}

        {/* Ad slot - shows after result */}
        {currentResult && (
          <div className="px-3 py-2 bg-gray-800">
            <AdSlot
              placement="result_banner"
              context={{ bin: currentResult.bin, item: currentResult.item }}
            />
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
                  <div className="relative">
                    <img
                      src={entry.image}
                      alt={entry.item}
                      className="w-full h-16 object-cover"
                      style={showCartoon ? { filter: 'contrast(1.3) saturate(1.4) brightness(1.1)' } : {}}
                    />
                    {showCartoon && (
                      <span className="absolute bottom-0 right-0 text-sm">{NANO_BANANA}</span>
                    )}
                  </div>
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
