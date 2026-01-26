import { useState, useEffect, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { identifyItem, generateCartoon, generateItemIcon, getQuizImageUrl, type IdentifyResponse, type DetectedObject } from '../services/api';
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
  imageKey?: string; // R2 image key for persistent storage
  item: string;
  bin: string;
  binIcon: string;
  binColor: string;
  result?: IdentifyResponse; // Full result for re-display
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
  onOpenFunFacts?: () => void;
  onRecyclingItem?: (item: { item: string; bin: string; confidence: number }) => void;
}

export function Scanner({ onOpenQuiz, onOpenLive, onOpenStats, onOpenSettings, onOpenTrip, onOpenFunFacts, onRecyclingItem }: ScannerProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera, captureImage } = useCamera();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0); // Track queued images
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentResult, setCurrentResult] = useState<IdentifyResponse | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [cartoonImage, setCartoonImage] = useState<string | null>(null);
  const [isGeneratingCartoon, setIsGeneratingCartoon] = useState(false);
  const [generatedIcon, setGeneratedIcon] = useState<string | null>(null); // Cute cartoon icon
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [showIconView, setShowIconView] = useState(true); // Toggle between icon and original image
  const [showCartoon, setShowCartoon] = useState(true);  // Cartoon mode as default
  const [showAllObjects, setShowAllObjects] = useState(false);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState(0);
  const [lightboxEntry, setLightboxEntry] = useState<HistoryEntry | null>(null); // For viewing history items
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-capture with motion detection
  const [autoCapture, setAutoCapture] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [motionDetected, setMotionDetected] = useState(false);
  const lastFrameRef = useRef<ImageData | null>(null);
  const motionTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
        // Only save last 10 items, without full images (just metadata + imageKey for R2)
        const toSave = history.slice(0, 10).map(h => ({
          ...h,
          image: '', // Don't store full images - too much data
          result: undefined, // Don't store full result - can be rebuilt from imageKey
        }));
        localStorage.setItem('scan_history', JSON.stringify(toSave));
      } catch (e) {
        console.error('Failed to save history:', e);
        // Clear history if quota exceeded
        localStorage.removeItem('scan_history');
      }
    }
  }, [history]);

  // Camera is NOT auto-started - user must tap to enable
  // This saves battery and gives user control
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCamera = useCallback(() => {
    if (isStreaming) {
      stopCamera();
      addLog('Myndavél slökkt', '📷', 'info');
    } else {
      startCamera();
      addLog('Myndavél kveikt', '📷', 'info');
    }
  }, [isStreaming, startCamera, stopCamera]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageBase64 = event.target?.result as string;
      if (imageBase64) {
        // Process the selected image
        handleCapture(imageBase64);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Motion detection for auto-capture
  useEffect(() => {
    if (!autoCapture || !isStreaming || !videoRef.current) return;

    // Create detection canvas if not exists
    if (!detectionCanvasRef.current) {
      detectionCanvasRef.current = document.createElement('canvas');
      detectionCanvasRef.current.width = 64; // Small for fast comparison
      detectionCanvasRef.current.height = 64;
    }

    const detectMotion = () => {
      if (!videoRef.current || !detectionCanvasRef.current) return;

      const ctx = detectionCanvasRef.current.getContext('2d');
      if (!ctx) return;

      // Draw current frame (small size for fast comparison)
      ctx.drawImage(videoRef.current, 0, 0, 64, 64);
      const currentFrame = ctx.getImageData(0, 0, 64, 64);

      if (lastFrameRef.current) {
        // Compare frames - calculate difference
        let diff = 0;
        const threshold = 30; // Pixel difference threshold
        for (let i = 0; i < currentFrame.data.length; i += 4) {
          const rDiff = Math.abs(currentFrame.data[i] - lastFrameRef.current.data[i]);
          const gDiff = Math.abs(currentFrame.data[i + 1] - lastFrameRef.current.data[i + 1]);
          const bDiff = Math.abs(currentFrame.data[i + 2] - lastFrameRef.current.data[i + 2]);
          if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
            diff++;
          }
        }

        // If more than 15% of pixels changed, motion detected
        const motionThreshold = (64 * 64) * 0.15;
        const hasMotion = diff > motionThreshold;

        if (hasMotion && !motionDetected && countdown === null && pendingCount === 0) {
          // Motion detected - start countdown
          setMotionDetected(true);
          addLog('Hreyfing greind! Niðurtalning...', '👀', 'info');

          // Clear any existing timeout
          if (motionTimeoutRef.current) {
            clearTimeout(motionTimeoutRef.current);
          }

          // Start 3-second countdown
          setCountdown(3);
        } else if (!hasMotion && motionDetected) {
          // Motion stopped - reset after a delay
          if (motionTimeoutRef.current) {
            clearTimeout(motionTimeoutRef.current);
          }
          motionTimeoutRef.current = window.setTimeout(() => {
            if (countdown === null) {
              setMotionDetected(false);
            }
          }, 1000);
        }
      }

      lastFrameRef.current = currentFrame;
    };

    // Check for motion every 200ms
    const intervalId = window.setInterval(detectMotion, 200);

    return () => {
      clearInterval(intervalId);
      if (motionTimeoutRef.current) {
        clearTimeout(motionTimeoutRef.current);
      }
    };
  }, [autoCapture, isStreaming, motionDetected, countdown, pendingCount, videoRef]);

  // Countdown timer
  const [triggerCapture, setTriggerCapture] = useState(false);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      countdownIntervalRef.current = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else {
      // Countdown finished - trigger capture!
      setCountdown(null);
      setMotionDetected(false);
      setTriggerCapture(true);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [countdown]);

  const addLog = (text: string, icon: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date(),
      text,
      icon,
      type,
    }]);
  };

  const handleCapture = async (providedImage?: string) => {
    // Allow rapid-fire: capture image immediately without waiting
    // If providedImage is given (from file picker), use that instead of capturing
    const image = providedImage || captureImage();
    if (!image) {
      addLog('Gat ekki tekið mynd - reyndu aftur', '❌', 'error');
      return;
    }

    // Check if image is too small (likely black/empty) - only for camera captures
    if (!providedImage && image.length < 5000) {
      addLog('Mynd of lítil - bíddu eftir myndavél', '⚠️', 'error');
      return;
    }

    // Only update current image if nothing is being processed
    if (pendingCount === 0) {
      setCurrentImage(image);
      setOverlayImage(null);
      setCartoonImage(null);
      setCurrentResult(null);
      setSelectedObjectIndex(0);
    }

    // Track pending request
    setPendingCount(prev => prev + 1);
    setIsLoading(true);

    const captureNum = pendingCount + 1;
    addLog(`Mynd #${captureNum} tekin`, '📸', 'info');
    addLog(`Sendi #${captureNum} til þjóns...`, '📤', 'pending');

    try {
      addLog(`Greini #${captureNum} með gervigreind...`, '🤖', 'pending');
      const response = await identifyItem(image);

      if (response.success) {
        // Check if it's actually a failed identification (0% confidence)
        if (response.confidence === 0 || response.item === 'Óþekkt hlutur') {
          addLog(`#${captureNum}: Gat ekki greint hlut`, '🤔', 'error');
          // Update current display if this is the most recent
          setCurrentImage(image);
          setCurrentResult(response);
          return;
        }

        addLog(`#${captureNum}: ${response.item} → ${response.binInfo?.name_is}`, response.binInfo?.icon || '✅', 'success');

        // Always update current result to show latest
        setCurrentImage(image);
        setCurrentResult(response);

        // Add to history
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: new Date(),
          image,
          imageKey: response.imageKey, // Store R2 key for persistent access
          item: response.item,
          bin: response.binInfo?.name_is || 'Óþekkt',
          binIcon: response.binInfo?.icon || '🗑️',
          binColor: response.binInfo?.color || '#6b7280',
          result: response, // Store full result for re-display
        };
        setHistory(prev => [entry, ...prev]);

        // Auto-add recycling center items to trip list
        if (response.bin === 'recycling_center' && onRecyclingItem) {
          addLog('Bætt við ferðalista 🚗', '♻️', 'info');
          onRecyclingItem({
            item: response.item,
            bin: response.bin,
            confidence: response.confidence,
          });
        }

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

        // Generate cute icon for the item (like ruslgreinir-google)
        setGeneratedIcon(null); // Clear previous icon
        setShowIconView(true); // Reset to show icon when new one is generated
        setIsGeneratingIcon(true);
        addLog('Teikna ikon...', '🎨', 'pending');
        generateItemIcon(image, response.item)
          .then(iconResponse => {
            if (iconResponse.success && iconResponse.iconImage) {
              setGeneratedIcon(iconResponse.iconImage);
              addLog('Ikon tilbúið!', '✨', 'success');
            } else {
              addLog('Gat ekki teiknað ikon', '⚠️', 'info');
            }
          })
          .catch(() => {
            addLog('Gat ekki teiknað ikon', '⚠️', 'info');
          })
          .finally(() => {
            setIsGeneratingIcon(false);
          });

        // Generate AI cartoon in background (only for last image in batch)
        if (showCartoon && pendingCount <= 1) {
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
          addLog(`#${captureNum}: AI þjónusta ekki tiltæk`, '⚠️', 'error');
        } else if (response.item === 'Óþekkt hlutur') {
          addLog(`#${captureNum}: Gat ekki greint hlut`, '🤔', 'error');
        } else {
          addLog(`#${captureNum}: ${errorMsg}`, '❌', 'error');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      addLog(`#${captureNum}: Nettenging mistókst`, '📡', 'error');
    } finally {
      // Decrement pending count
      setPendingCount(prev => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsLoading(false);
        }
        return newCount;
      });
    }
  };

  // Effect to trigger capture from countdown
  useEffect(() => {
    if (triggerCapture) {
      setTriggerCapture(false);
      handleCapture();
    }
  }, [triggerCapture]);

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
      <header className="safe-top bg-green-600 text-white p-3 flex items-center justify-between shadow-lg relative z-40">
        <h1 className="text-lg font-bold">♻️ Ruslaflokkun</h1>
        <div className="flex gap-2">
          <button onClick={onOpenLive} className="text-xl p-1" title="Talandi lýsing">🔊</button>
          <button onClick={onOpenQuiz} className="text-xl p-1" title="Leikur">🎮</button>
          {onOpenFunFacts && <button onClick={onOpenFunFacts} className="text-xl p-1" title="Fróðleikur">💡</button>}
          <button onClick={onOpenStats} className="text-xl p-1" title="Tölfræði">📊</button>
          {onOpenTrip && <button onClick={onOpenTrip} className="text-xl p-1" title="Ferð">🚗</button>}
          <button onClick={onOpenSettings} className="text-xl p-1" title="Stillingar">⚙️</button>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-auto">
        {/* Hidden file input for image selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Camera section */}
        <div className="relative bg-black" style={{ height: '35vh', minHeight: '200px' }}>
          <canvas ref={canvasRef} className="hidden" />
          {/* Video element - always rendered but hidden when camera off */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${isStreaming ? '' : 'hidden'}`}
          />
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-green-600 rounded-lg"
                >
                  📁 Velja mynd
                </button>
              </div>
            </div>
          ) : !isStreaming ? (
            /* Camera OFF - show last result or placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              {/* Show last result image if available */}
              {currentImage ? (
                <img
                  src={currentImage}
                  alt="Síðasta mynd"
                  className="absolute inset-0 w-full h-full object-contain opacity-30"
                />
              ) : history.length > 0 && (history[0].imageKey || history[0].image) ? (
                <img
                  src={history[0].imageKey ? getQuizImageUrl(history[0].imageKey) : history[0].image}
                  alt="Síðasta mynd"
                  className="absolute inset-0 w-full h-full object-contain opacity-30"
                />
              ) : null}

              <div className="relative z-10 text-center">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-white/70 mb-4">Myndavél slökkt</p>
                <div className="flex gap-3">
                  <button
                    onClick={toggleCamera}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
                  >
                    🎥 Kveikja
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                  >
                    📁 Velja mynd
                  </button>
                </div>
              </div>

              {/* Pending indicator */}
              {pendingCount > 0 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                  ⏳ {pendingCount} í vinnslu
                </div>
              )}
            </div>
          ) : (
            /* Camera ON - controls overlay */
            <>
              {/* Scan frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-48 border-2 rounded-2xl transition-colors ${
                  countdown !== null ? 'border-green-400 animate-pulse' :
                  motionDetected ? 'border-yellow-400' :
                  'border-white/40'
                }`} />
              </div>
              {/* Countdown display */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 bg-green-500/80 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-5xl font-bold">{countdown || '📸'}</span>
                  </div>
                </div>
              )}
              {/* Motion indicator */}
              {autoCapture && motionDetected && countdown === null && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium">
                  👀 Hreyfing greind...
                </div>
              )}
              {/* Camera toggle (top left) */}
              <button
                onClick={toggleCamera}
                className="absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium bg-red-500 text-white"
              >
                🔴 Slökkva
              </button>
              {/* Auto-capture toggle */}
              <button
                onClick={() => {
                  setAutoCapture(!autoCapture);
                  setCountdown(null);
                  setMotionDetected(false);
                  addLog(autoCapture ? 'Sjálfvirk myndataka slökkt' : 'Sjálfvirk myndataka kveikt', autoCapture ? '🔴' : '🟢', 'info');
                }}
                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  autoCapture ? 'bg-green-500 text-white' : 'bg-gray-800/70 text-white'
                }`}
              >
                {autoCapture ? '🤖 Auto' : '👆 Handvirkt'}
              </button>
              {/* Capture button - allows rapid-fire */}
              <button
                onClick={() => handleCapture()}
                disabled={!isStreaming}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-4 border-green-500
                         flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  {pendingCount > 0 && (
                    <span className="text-white text-xs font-bold">{pendingCount}</span>
                  )}
                </div>
              </button>
              {/* Pending indicator */}
              {pendingCount > 0 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                  ⏳ {pendingCount} í vinnslu
                </div>
              )}
            </>
          )}
        </div>

        {/* Current Result */}
        {currentResult && (
          <div
            className="p-4 text-white"
            style={{ backgroundColor: currentResult.confidence === 0 ? '#dc2626' : (currentResult.binInfo?.color || '#6b7280') }}
          >
            {/* Result card with icon (like ruslgreinir-google) */}
            <div className="flex items-start gap-4 mb-3">
              {/* Icon box - shows generated icon or loading spinner, clickable to toggle */}
              <div
                className="relative flex-shrink-0 w-24 h-24 bg-white rounded-xl overflow-hidden flex items-center justify-center border-2 border-white/30 shadow-lg cursor-pointer active:scale-95 transition-transform"
                onClick={() => generatedIcon && currentImage && setShowIconView(!showIconView)}
                title={generatedIcon && currentImage ? 'Smelltu til að skipta milli' : undefined}
              >
                {isGeneratingIcon ? (
                  /* Loading state - generating icon */
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-xs">Teikna...</span>
                  </div>
                ) : generatedIcon && showIconView ? (
                  /* Show generated cute icon */
                  <img
                    src={generatedIcon}
                    alt={currentResult.item}
                    className="w-full h-full object-cover"
                  />
                ) : currentImage ? (
                  /* Show original/cartoon image */
                  <img
                    src={
                      showCartoon && cartoonImage
                        ? cartoonImage
                        : (currentResult?.isWideShot && overlayImage)
                          ? overlayImage
                          : currentImage
                    }
                    alt=""
                    className="w-full h-full object-cover"
                    style={getCartoonStyle()}
                  />
                ) : (
                  /* Placeholder */
                  <span className="text-4xl">{currentResult.binInfo?.icon || '🗑️'}</span>
                )}
                {/* Wide shot indicator */}
                {currentResult?.isWideShot && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded">
                    {currentResult.allObjects?.length || 0}
                  </div>
                )}
                {/* Toggle indicator when both images available */}
                {generatedIcon && currentImage && (
                  <div className="absolute -top-1 -left-1 bg-black/60 text-white text-xs px-1 rounded">
                    {showIconView ? '🎨' : '📷'}
                  </div>
                )}
                {/* Nano banana for scale */}
                {(generatedIcon || (showCartoon && currentImage)) && (
                  <div
                    className="absolute -bottom-1 -right-1 text-xl drop-shadow-lg animate-bounce"
                    title={getBananaComment()}
                  >
                    {NANO_BANANA}
                  </div>
                )}
              </div>

              {/* Text content */}
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
              {history.map(entry => {
                // Use R2 URL if available, otherwise fall back to base64
                const imageUrl = entry.imageKey
                  ? getQuizImageUrl(entry.imageKey)
                  : entry.image;
                const hasImage = entry.imageKey || entry.image;

                return (
                  <div
                    key={entry.id}
                    className="flex-shrink-0 w-24 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                    onClick={() => {
                      if (entry.result) {
                        // Load full result into main view
                        setCurrentResult(entry.result);
                        setCurrentImage(entry.image || (entry.imageKey ? getQuizImageUrl(entry.imageKey) : null));
                        setCartoonImage(null);
                        setOverlayImage(null);
                      } else if (hasImage) {
                        // Just open lightbox for viewing
                        setLightboxEntry(entry);
                      }
                    }}
                  >
                    <div className="relative">
                      {hasImage ? (
                        <img
                          src={imageUrl}
                          alt={entry.item}
                          className="w-full h-16 object-cover"
                          style={showCartoon ? { filter: 'contrast(1.3) saturate(1.4) brightness(1.1)' } : {}}
                        />
                      ) : (
                        <div className="w-full h-16 bg-gray-700 flex items-center justify-center text-2xl">
                          {entry.binIcon}
                        </div>
                      )}
                      {showCartoon && hasImage && (
                        <span className="absolute bottom-0 right-0 text-sm">{NANO_BANANA}</span>
                      )}
                      {entry.imageKey && (
                        <span className="absolute top-0 left-0 bg-green-500/80 text-xs px-1 rounded-br" title="Vistað í skýi">☁️</span>
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
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer safe area */}
      <div className="safe-bottom bg-gray-700" />

      {/* Lightbox modal for viewing history images */}
      {lightboxEntry && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxEntry(null)}
        >
          <button
            onClick={() => setLightboxEntry(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ×
          </button>
          <div className="max-w-full max-h-[70vh] overflow-hidden rounded-xl" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxEntry.imageKey ? getQuizImageUrl(lightboxEntry.imageKey) : lightboxEntry.image}
              alt={lightboxEntry.item}
              className="max-w-full max-h-[70vh] object-contain rounded-xl"
              style={showCartoon ? { filter: 'contrast(1.3) saturate(1.4) brightness(1.1)' } : {}}
            />
          </div>
          <div
            className="mt-4 px-6 py-3 rounded-xl text-white text-center"
            style={{ backgroundColor: lightboxEntry.binColor }}
          >
            <div className="text-3xl mb-1">{lightboxEntry.binIcon}</div>
            <div className="text-xl font-bold">{lightboxEntry.item}</div>
            <div className="text-sm opacity-80">{lightboxEntry.bin}</div>
            <div className="text-xs opacity-60 mt-1">
              {lightboxEntry.timestamp.toLocaleString('is-IS')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
