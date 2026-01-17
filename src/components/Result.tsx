import type { IdentifyResponse } from '../services/api';

interface ResultProps {
  result: IdentifyResponse;
  onReset: () => void;
}

export function Result({ result, onReset }: ResultProps) {
  const binColor = result.binInfo?.color || '#6b7280';
  
  return (
    <div className="h-full flex flex-col p-6 safe-top safe-bottom overflow-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">{result.binInfo?.icon || '🗑️'}</div>
        <h1 className="text-2xl font-bold text-gray-800">{result.item}</h1>
      </div>

      {/* Bin card */}
      <div 
        className="rounded-2xl p-6 mb-6 text-white shadow-lg"
        style={{ backgroundColor: binColor }}
      >
        <div className="text-center">
          <div className="text-lg opacity-90 mb-1">Fer í</div>
          <div className="text-3xl font-bold">{result.binInfo?.name_is}</div>
        </div>
      </div>

      {/* Reason */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow">
        <p className="text-gray-700">{result.reason}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-white rounded-xl p-4 text-center shadow">
          <div className="text-3xl font-bold text-green-600">+{result.points}</div>
          <div className="text-sm text-gray-500">stig</div>
        </div>
        <div className="flex-1 bg-white rounded-xl p-4 text-center shadow">
          <div className="text-3xl font-bold text-orange-500">{result.streak}🔥</div>
          <div className="text-sm text-gray-500">streak</div>
        </div>
      </div>

      {/* Fun fact */}
      {result.funFact && (
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-sm font-medium text-blue-800">💡 Vissir þú?</div>
          <p className="text-blue-700 text-sm mt-1">{result.funFact}</p>
        </div>
      )}

      {/* Reset button */}
      <button
        onClick={onReset}
        className="mt-auto bg-green-600 text-white font-bold py-4 px-8 rounded-full
                   shadow-lg active:scale-95 transition-transform"
      >
        Skanna aftur
      </button>
    </div>
  );
}
