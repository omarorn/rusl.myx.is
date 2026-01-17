import { useState, useRef, useEffect } from 'react'

interface ClassifyResult {
  success: boolean
  item: string
  bin: string
  bin_name: string
  bin_color: string
  reason: string
  confidence: number
  points?: number
  streak?: number
  fun_fact?: string
  special_instructions?: string
}

type AppState = 'idle' | 'camera' | 'scanning' | 'result'

const API_URL = import.meta.env.PROD 
  ? 'https://trash.myx.is/api' 
  : 'http://localhost:8787/api'

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [result, setResult] = useState<ClassifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Get device ID (persistent)
  const getDeviceId = () => {
    let id = localStorage.getItem('device_id')
    if (!id) {
      id = 'pwa_' + Math.random().toString(36).substring(2, 14)
      localStorage.setItem('device_id', id)
    }
    return id
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setState('camera')
    } catch (err) {
      setError('Gat ekki opnað myndavél')
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const captureAndClassify = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setState('scanning')
    
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

    try {
      // Get location (optional)
      let lat, lng
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {}
      }

      const response = await fetch(`${API_URL}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          lat,
          lng,
          device_id: getDeviceId(),
          source: 'pwa'
        })
      })

      if (!response.ok) {
        throw new Error('API villa')
      }

      const data = await response.json()
      setResult(data)
      setState('result')
      stopCamera()

    } catch (err) {
      setError('Villa við greiningu')
      setState('camera')
      console.error(err)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setState('idle')
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="p-4 text-center border-b border-gray-800">
        <h1 className="text-2xl font-bold">🗑️ Rusl.myx.is</h1>
        <p className="text-gray-400 text-sm">Íslensk ruslaflokkun með AI</p>
      </header>

      {/* Main content */}
      <main className="p-4">
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-8 py-12">
            <div className="text-6xl">📷</div>
            <p className="text-gray-300 text-center">
              Taktu mynd af hlut og sjáðu í hvaða tunnu hann á að fara
            </p>
            <button
              onClick={startCamera}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl"
            >
              Opna myndavél
            </button>
            
            {/* Bin legend */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[
                { name: 'Pappír', color: '#2563eb', icon: '📄' },
                { name: 'Plast', color: '#16a34a', icon: '♻️' },
                { name: 'Matarleifar', color: '#92400e', icon: '🍎' },
                { name: 'Blandað', color: '#6b7280', icon: '🗑️' },
              ].map(bin => (
                <div key={bin.name} className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: bin.color }}
                  >
                    {bin.icon}
                  </div>
                  <span className="text-gray-300">{bin.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {state === 'camera' && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none" />
            </div>
            
            <button
              onClick={captureAndClassify}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl"
            >
              📸 Skanna
            </button>
            
            <button
              onClick={() => { stopCamera(); reset() }}
              className="text-gray-400 hover:text-white"
            >
              Hætta við
            </button>
          </div>
        )}

        {state === 'scanning' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="animate-spin text-6xl">⏳</div>
            <p className="text-gray-300">Greini mynd...</p>
          </div>
        )}

        {state === 'result' && result && (
          <div className="flex flex-col items-center gap-6">
            {/* Result card */}
            <div 
              className="w-full max-w-md rounded-2xl p-6"
              style={{ backgroundColor: result.bin_color }}
            >
              <h2 className="text-3xl font-bold text-white text-center">
                {result.bin_name}
              </h2>
            </div>
            
            {/* Details */}
            <div className="w-full max-w-md bg-gray-800 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-gray-400">Hlutur:</span>
                <span className="ml-2 text-white">{result.item}</span>
              </div>
              <div>
                <span className="text-gray-400">Ástæða:</span>
                <span className="ml-2 text-white">{result.reason}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Viss:</span>
                <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                <span className="text-white">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            {/* Gamification */}
            {(result.points || result.streak) && (
              <div className="flex gap-4">
                {result.points && (
                  <div className="bg-yellow-600 rounded-lg px-4 py-2">
                    +{result.points} stig
                  </div>
                )}
                {result.streak && result.streak > 1 && (
                  <div className="bg-orange-600 rounded-lg px-4 py-2">
                    🔥 {result.streak} daga streak
                  </div>
                )}
              </div>
            )}

            {/* Fun fact */}
            {result.fun_fact && (
              <div className="w-full max-w-md bg-gray-800 rounded-xl p-4">
                <p className="text-gray-300 text-sm italic">
                  💡 {result.fun_fact}
                </p>
              </div>
            )}

            {/* Special instructions */}
            {result.special_instructions && (
              <div className="w-full max-w-md bg-purple-900 rounded-xl p-4">
                <p className="text-white">
                  ⚠️ {result.special_instructions}
                </p>
              </div>
            )}

            {/* Scan again */}
            <button
              onClick={reset}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl"
            >
              Skanna aftur
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white p-4 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-4">✕</button>
          </div>
        )}
      </main>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
