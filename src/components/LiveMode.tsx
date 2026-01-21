import { useState, useEffect, useRef, useCallback } from 'react';
import { describeImage } from '../services/api';

interface LiveModeProps {
  onClose: () => void;
}

export function LiveMode({ onClose }: LiveModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDescription, setCurrentDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('Gat ekki opnað myndavél');
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
  }, []);

  // Capture and describe
  const captureAndDescribe = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.7);

    try {
      setIsProcessing(true);
      setIsActive(true);

      const response = await describeImage(imageData);

      if (response.success && response.description) {
        setCurrentDescription(response.description);
      } else if (response.error) {
        console.error('Describe error:', response.error);
        setError(response.error);
      }
    } catch (err) {
      console.error('Describe error:', err);
      setError('Villa við að greina mynd');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Toggle auto mode
  const toggleAutoMode = useCallback(() => {
    if (autoMode) {
      // Stop auto mode
      setAutoMode(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Start auto mode
      setAutoMode(true);
      captureAndDescribe();
      intervalRef.current = window.setInterval(captureAndDescribe, 4000);
    }
  }, [autoMode, captureAndDescribe]);

  // Handle screen tap - single capture
  const handleScreenTap = () => {
    if (!autoMode && !isProcessing) {
      captureAndDescribe();
    }
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <header className="safe-top bg-gray-900/90 text-white p-3 flex items-center justify-between">
        <button onClick={onClose} className="p-2 text-xl">←</button>
        <h1 className="text-lg font-semibold">Lýsing á mynd</h1>
        <div className="w-10" />
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-600 text-white p-3 text-center text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Loka</button>
        </div>
      )}

      {/* Video feed - tap to capture */}
      <div
        className="flex-1 relative"
        onClick={handleScreenTap}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status indicator */}
        <div className="absolute top-3 left-3 right-3">
          {isProcessing ? (
            <div className="bg-yellow-500 text-black rounded-lg px-4 py-2 text-center font-medium">
              <span className="animate-pulse">Greini mynd...</span>
            </div>
          ) : autoMode ? (
            <div className="bg-green-600 text-white rounded-lg px-4 py-2 text-center">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span>
              Sjálfvirkt virkt
            </div>
          ) : (
            <div className="bg-gray-800/80 text-white rounded-lg px-4 py-2 text-center">
              Ýttu á skjáinn til að greina
            </div>
          )}
        </div>

        {/* Description overlay */}
        {currentDescription && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-4 pt-12">
            <div className="text-white">
              <p className="text-lg leading-relaxed">{currentDescription}</p>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="safe-bottom bg-gray-900 p-4">
        <div className="flex items-center justify-around">
          {/* Single capture */}
          <button
            onClick={captureAndDescribe}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 active:scale-95 transition-transform"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs">Greina</span>
          </button>

          {/* Auto mode toggle */}
          <button
            onClick={toggleAutoMode}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl text-white active:scale-95 transition-all ${
              autoMode ? 'bg-red-600' : 'bg-green-600'
            }`}
          >
            <span className="text-2xl">{autoMode ? '⏹' : '▶️'}</span>
            <span className="text-xs">{autoMode ? 'Stoppa' : 'Sjálfvirkt'}</span>
          </button>

          {/* Clear description */}
          <button
            onClick={() => setCurrentDescription(null)}
            disabled={!currentDescription}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-700 text-white disabled:opacity-50 active:scale-95 transition-transform"
          >
            <span className="text-2xl">🗑️</span>
            <span className="text-xs">Hreinsa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
