import { useState, useEffect, useRef, useCallback } from 'react';
import { describeImage } from '../services/api';

interface LiveModeProps {
  onClose: () => void;
}

type LogEntry = {
  type: 'system' | 'ai' | 'user';
  text: string;
  timestamp: number;
};

export function LiveMode({ onClose }: LiveModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDescription, setCurrentDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Add log entry
  const addLog = useCallback((type: 'system' | 'ai' | 'user', text: string) => {
    setLogs(prev => [...prev, { type, text, timestamp: Date.now() }]);
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        addLog('system', 'Opna myndavél...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
          addLog('system', 'Myndavél tilbúin');
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Gat ekki opnað myndavél');
        addLog('system', 'Villa: Gat ekki opnað myndavél');
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [addLog]);

  // Capture from camera
  const captureFromCamera = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  // Process image with AI
  const processImage = useCallback(async (imageData: string, source: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setCaptureCount(c => c + 1);
      addLog('user', `Mynd ${source}`);

      const response = await describeImage(imageData);

      if (response.success && response.description) {
        setCurrentDescription(response.description);
        addLog('ai', response.description);
      } else if (response.error) {
        console.error('Describe error:', response.error);
        setError(response.error);
        addLog('system', `Villa: ${response.error}`);
      }
    } catch (err) {
      console.error('Describe error:', err);
      setError('Villa við að greina mynd');
      addLog('system', 'Villa við að greina mynd');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, addLog]);

  // Capture and describe from camera
  const captureAndDescribe = useCallback(async () => {
    const imageData = captureFromCamera();
    if (imageData) {
      await processImage(imageData, 'frá myndavél');
    }
  }, [captureFromCamera, processImage]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        processImage(result, 'úr skrá');
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processImage]);

  // Toggle auto mode
  const toggleAutoMode = useCallback(() => {
    if (autoMode) {
      setAutoMode(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog('system', 'Sjálfvirk greining stoppaður');
    } else {
      setAutoMode(true);
      addLog('system', 'Sjálfvirk greining byrjuð (á 4 sek fresti)');
      captureAndDescribe();
      intervalRef.current = window.setInterval(captureAndDescribe, 4000);
    }
  }, [autoMode, captureAndDescribe, addLog]);

  // Handle screen tap
  const handleScreenTap = () => {
    if (!autoMode && !isProcessing && cameraReady) {
      captureAndDescribe();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <header className="safe-top bg-slate-800 text-white p-3 flex items-center justify-between border-b border-slate-700">
        <button onClick={onClose} className="p-2 text-xl hover:bg-slate-700 rounded-lg transition-colors">
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <h1 className="text-lg font-semibold">Greining myndar</h1>
        </div>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="p-2 text-sm hover:bg-slate-700 rounded-lg transition-colors"
        >
          {showLogs ? '✕' : '📋'}
        </button>
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-600 text-white p-3 text-center text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:underline">Loka</button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video feed */}
        <div
          className="absolute inset-0"
          onClick={handleScreenTap}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-lg font-medium animate-pulse">Greini mynd...</span>
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className="absolute top-4 left-4 right-4">
            {autoMode ? (
              <div className="bg-green-600/90 backdrop-blur text-white rounded-xl px-4 py-2 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="font-medium">Sjálfvirk greining virk</span>
                </div>
                <span className="text-xs text-green-200">Myndir: {captureCount}</span>
              </div>
            ) : (
              <div className="bg-slate-800/90 backdrop-blur text-white rounded-xl px-4 py-3 text-center shadow-lg">
                <span className="text-lg">👆 Ýttu á skjáinn til að greina</span>
              </div>
            )}
          </div>

          {/* Description overlay */}
          {currentDescription && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-6 pt-16">
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
                <div className="text-sm text-blue-400 mb-2 flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span>Gervigreind segir:</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{currentDescription}</p>
              </div>
            </div>
          )}
        </div>

        {/* Logs panel */}
        {showLogs && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-slate-900/95 backdrop-blur border-l border-slate-700 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white font-medium">Skrá</span>
              <button onClick={() => setLogs([])} className="text-xs text-slate-400 hover:text-white">
                Hreinsa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {logs.map((log, i) => (
                <div key={i} className={`rounded p-2 ${
                  log.type === 'system' ? 'bg-slate-800 text-slate-400' :
                  log.type === 'ai' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-green-900/50 text-green-300'
                }`}>
                  <span className="text-xs opacity-60">
                    {new Date(log.timestamp).toLocaleTimeString('is-IS')}
                  </span>
                  <p>{log.text}</p>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
        capture="environment"
      />

      {/* Bottom controls */}
      <div className="safe-bottom bg-slate-800 border-t border-slate-700 p-4">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Upload image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-700 text-white disabled:opacity-50 active:scale-95 transition-all hover:bg-slate-600"
          >
            <span className="text-2xl">🖼️</span>
            <span className="text-xs">Velja mynd</span>
          </button>

          {/* Capture button - larger and centered */}
          <button
            onClick={captureAndDescribe}
            disabled={isProcessing || !cameraReady}
            className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-blue-600 text-white disabled:opacity-50 active:scale-95 transition-all hover:bg-blue-500 shadow-lg shadow-blue-600/30"
          >
            <span className="text-3xl">📷</span>
            <span className="text-xs font-medium">Greina</span>
          </button>

          {/* Auto mode toggle */}
          <button
            onClick={toggleAutoMode}
            disabled={!cameraReady}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl text-white disabled:opacity-50 active:scale-95 transition-all ${
              autoMode
                ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            <span className="text-2xl">{autoMode ? '⏹' : '▶️'}</span>
            <span className="text-xs">{autoMode ? 'Stoppa' : 'Sjálfvirkt'}</span>
          </button>
        </div>

        {/* Hints */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <span className="block text-slate-500">Dæmi</span>
            <span>"Hvar á plastflaska að fara?"</span>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <span className="block text-slate-500">Dæmi</span>
            <span>"Er þetta pappír eða plast?"</span>
          </div>
        </div>
      </div>
    </div>
  );
}
