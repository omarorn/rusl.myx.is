import { useState, useEffect, useRef, useCallback } from 'react';
import { speakImage, textToSpeech } from '../services/api';

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
  const [speechReady, setSpeechReady] = useState(true); // Gemini TTS is always ready
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play base64 audio from Gemini TTS
  const playAudio = useCallback((audioBase64: string, mimeType: string = 'audio/wav') => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      // Create audio element from base64 data
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioRef.current = audio;

      audio.onplay = () => {
        console.log('[TTS] Started playing');
        setIsSpeaking(true);
      };

      audio.onended = () => {
        console.log('[TTS] Finished playing');
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio error:', e);
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.play().catch(err => {
        console.error('[TTS] Play error:', err);
        setError('Gat ekki spilað hljóð - ýttu á skjáinn til að virkja');
        setIsSpeaking(false);
      });
    } catch (err) {
      console.error('[TTS] Error creating audio:', err);
      setIsSpeaking(false);
    }
  }, []);

  // Speak text using Gemini TTS API
  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log('[TTS] Requesting speech for:', text);

      const response = await textToSpeech(text);

      if (response.success && response.audio) {
        playAudio(response.audio, response.mimeType || 'audio/wav');
      } else {
        console.error('[TTS] Failed:', response.error);
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('[TTS] Error:', err);
      setIsSpeaking(false);
    }
  }, [playAudio]);

  // Capture frame, get description and audio from Gemini TTS
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
      // Use combined endpoint: describe + TTS in one call
      const response = await speakImage(imageData);
      setIsListening(false);

      if (response.success && response.description) {
        setCurrentDescription(response.description);

        // Play audio if available
        if (response.audio) {
          playAudio(response.audio, response.mimeType || 'audio/wav');
        }
      } else if (response.error) {
        console.error('Speak error:', response.error);
      }
    } catch (err) {
      console.error('Describe error:', err);
      setIsListening(false);
    }
  }, [playAudio, isSpeaking]);

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Test speech to enable audio on user interaction
  const testSpeech = () => {
    speak('Hæ! Ég er tilbúin.');
  };

  // Toggle live mode
  const toggleActive = () => {
    if (isActive) {
      // Stop
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopAudio();
    } else {
      // Start - first speak to ensure audio is enabled
      speak('Byrja að greina');
      setIsActive(true);
      // Capture immediately, then every 5 seconds (adjusted for TTS latency)
      setTimeout(() => captureAndDescribe(), 2000); // Wait for intro speech
      intervalRef.current = window.setInterval(captureAndDescribe, 5000);
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
          {/* Voice status indicator - Gemini TTS */}
          {!isActive && (
            <div className="mt-2 bg-blue-500/80 rounded-xl p-2 text-white text-center text-xs">
              🔊 Gemini TTS (is-IS)
            </div>
          )}
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
          {/* Test audio button */}
          <button
            onClick={testSpeech}
            disabled={isActive || !speechReady}
            className="w-16 h-16 rounded-full bg-purple-500 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            title="Prófa hljóð"
          >
            🔊
          </button>

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
            onClick={stopAudio}
            disabled={!isSpeaking}
            className="w-16 h-16 rounded-full bg-orange-500 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
          >
            🔇
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">
          {isActive
            ? 'Lýsing á 5 sekúndna fresti • Ýttu á rauða hnappinn til að stoppa'
            : '🔊 Prófa hljóð • 📷 Stök lýsing • ▶️ Sjálfvirk lýsing'}
        </p>
      </div>
    </div>
  );
}
