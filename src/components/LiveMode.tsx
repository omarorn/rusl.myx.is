import { useState, useEffect, useRef, useCallback } from 'react';
import { describeImage } from '../services/api';

interface LiveModeProps {
  onClose: () => void;
}

export function LiveMode({ onClose }: LiveModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentDescription, setCurrentDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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
      window.speechSynthesis.cancel();
    };
  }, []);

  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'is-IS'; // Icelandic
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find Icelandic voice, fallback to default
    const voices = window.speechSynthesis.getVoices();
    const icelandicVoice = voices.find(v => v.lang.startsWith('is'));
    if (icelandicVoice) {
      utterance.voice = icelandicVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Capture frame and get description
  const captureAndDescribe = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isSpeaking) return;

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
      setIsListening(true);
      const response = await describeImage(imageData);
      setIsListening(false);

      if (response.success && response.description) {
        setCurrentDescription(response.description);
        speak(response.description);
      }
    } catch (err) {
      console.error('Describe error:', err);
      setIsListening(false);
    }
  }, [speak, isSpeaking]);

  // Toggle live mode
  const toggleActive = () => {
    if (isActive) {
      // Stop
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Start
      setIsActive(true);
      // Capture immediately, then every 4 seconds
      captureAndDescribe();
      intervalRef.current = window.setInterval(captureAndDescribe, 4000);
    }
  };

  // Manual capture (one-shot)
  const manualCapture = () => {
    if (!isActive) {
      captureAndDescribe();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-blue-900 to-black">
      {/* Header */}
      <header className="safe-top bg-blue-600 text-white p-4 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="text-2xl">←</button>
        <h1 className="text-xl font-bold">🔊 Talandi lýsing</h1>
        <div className="w-8" />
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-red-500 text-white p-4 text-center">
          {error}
        </div>
      )}

      {/* Video feed */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Status overlay */}
        <div className="absolute top-4 left-4 right-4">
          <div className={`rounded-xl p-3 ${
            isActive ? 'bg-green-500/90' : 'bg-gray-800/90'
          } text-white text-center`}>
            {isActive ? (
              <div className="flex items-center justify-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-yellow-400 animate-pulse' : isSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-green-300'}`} />
                <span>
                  {isListening ? 'Greini mynd...' : isSpeaking ? 'Tala...' : 'Virkt - hlusta...'}
                </span>
              </div>
            ) : (
              <span>Ýttu á hnapp til að byrja</span>
            )}
          </div>
        </div>

        {/* Current description */}
        {currentDescription && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black/80 rounded-xl p-4 text-white">
              <div className="text-sm text-blue-300 mb-1">Síðasta lýsing:</div>
              <div className="text-lg">{currentDescription}</div>
            </div>
          </div>
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-8xl animate-pulse">🔊</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="safe-bottom bg-gray-900 p-6">
        <div className="flex gap-4 justify-center">
          {/* Manual capture button */}
          <button
            onClick={manualCapture}
            disabled={isActive || isListening}
            className="w-16 h-16 rounded-full bg-blue-500 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            📷
          </button>

          {/* Toggle live mode button */}
          <button
            onClick={toggleActive}
            className={`w-20 h-20 rounded-full text-white text-3xl flex items-center justify-center active:scale-95 transition-all ${
              isActive
                ? 'bg-red-500 animate-pulse'
                : 'bg-green-500'
            }`}
          >
            {isActive ? '⏹️' : '▶️'}
          </button>

          {/* Stop speaking button */}
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }}
            disabled={!isSpeaking}
            className="w-16 h-16 rounded-full bg-orange-500 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            🔇
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">
          {isActive
            ? 'Lýsing á 4 sekúndna fresti • Ýttu á rauða hnappinn til að stoppa'
            : 'Grænn hnappur: Byrja sjálfvirka lýsingu • Blár: Stök lýsing'}
        </p>
      </div>
    </div>
  );
}
