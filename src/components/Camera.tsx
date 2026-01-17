import { useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';

interface CameraProps {
  onCapture: (image: string) => void;
  isLoading: boolean;
}

export function Camera({ onCapture, isLoading }: CameraProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, captureImage } = useCamera();

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCapture = () => {
    const image = captureImage();
    if (image) onCapture(image);
  };

  return (
    <div className="relative h-full flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      
      {error ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-4 border-white/50 rounded-3xl" />
            </div>
          </div>

          {/* Capture button */}
          <div className="safe-bottom bg-black/80 p-6 flex justify-center">
            <button
              onClick={handleCapture}
              disabled={!isStreaming || isLoading}
              className="w-20 h-20 rounded-full bg-white border-4 border-green-500 
                       flex items-center justify-center shadow-lg
                       disabled:opacity-50 active:scale-95 transition-transform"
            >
              {isLoading ? (
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-green-500" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
