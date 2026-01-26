import { useState, useEffect } from 'react';
import { getAllFunFacts, getFunFactHistory, getQuizImageUrl, type FunFact } from '../services/api';

interface FunFactsProps {
  onClose: () => void;
}

export function FunFacts({ onClose }: FunFactsProps) {
  const [userHash] = useState(() => {
    try {
      return localStorage.getItem('user_hash') || `anon_${Math.random().toString(36).substring(7)}`;
    } catch {
      return `anon_${Math.random().toString(36).substring(7)}`;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allFacts, setAllFacts] = useState<FunFact[]>([]);
  const [seenFacts, setSeenFacts] = useState<FunFact[]>([]);
  const [unseenFacts, setUnseenFacts] = useState<FunFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<FunFact | null>(null);
  const [view, setView] = useState<'all' | 'seen' | 'unseen'>('all');

  useEffect(() => {
    loadFunFacts();
  }, [userHash]);

  const loadFunFacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllFunFacts(userHash);
      if (response.success) {
        setAllFacts(response.facts);
        setSeenFacts(response.seen);
        setUnseenFacts(response.unseen);
      } else {
        setError('Gat ekki sótt fróðleik');
      }
    } catch (err) {
      console.error('Failed to load fun facts:', err);
      setError('Villa kom upp við að sækja fróðleik');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      plastic: '🧴',
      metal: '🥫',
      '3d_print': '🖨️',
      glass: '🫙',
      paper: '📄',
      food: '🍎',
      general: '♻️',
      deposit: '💰',
      recycling_center: '🏭',
    };
    return icons[category] || '💡';
  };

  const getCurrentList = () => {
    switch (view) {
      case 'seen':
        return seenFacts;
      case 'unseen':
        return unseenFacts;
      default:
        return allFacts;
    }
  };

  const currentList = getCurrentList();

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <header className="safe-top bg-purple-600 text-white p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-xl p-1">←</button>
          <h1 className="text-lg font-bold">💡 Fróðleikur</h1>
        </div>
        <div className="text-sm">
          {seenFacts.length}/{allFacts.length}
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-gray-800 flex">
        <button
          onClick={() => setView('all')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Allt ({allFacts.length})
        </button>
        <button
          onClick={() => setView('unseen')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === 'unseen' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Ólesið ({unseenFacts.length})
        </button>
        <button
          onClick={() => setView('seen')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === 'seen' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Lesið ({seenFacts.length})
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Sæki fróðleik...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-400">
              <div className="text-4xl mb-2">❌</div>
              <p>{error}</p>
              <button
                onClick={loadFunFacts}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
              >
                Reyna aftur
              </button>
            </div>
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">
                {view === 'unseen' ? '🎉' : '📭'}
              </div>
              <p>
                {view === 'unseen' ? 'Þú hefur lesið allan fróðleik!' : 'Enginn fróðleikur hér'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {currentList.map((fact) => (
              <div
                key={fact.id}
                onClick={() => setSelectedFact(fact)}
                className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-purple-500 ${
                  fact.seen ? 'opacity-70' : ''
                }`}
              >
                {/* Image if available */}
                {fact.image_key && (
                  <div className="relative h-40 bg-gray-700">
                    <img
                      src={getQuizImageUrl(fact.image_key)}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {fact.seen && (
                      <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                        ✓ Lesið
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">
                      {getCategoryIcon(fact.category)}
                    </span>
                    <div className="flex-1">
                      <p className="text-white text-sm leading-relaxed">
                        {fact.fact_is}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className="bg-gray-700 px-2 py-1 rounded">
                          {fact.category}
                        </span>
                        {fact.seen && fact.seen_at && (
                          <span>
                            {new Date(fact.seen_at * 1000).toLocaleDateString('is-IS')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer safe area */}
      <div className="safe-bottom bg-gray-900" />

      {/* Detail modal */}
      {selectedFact && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setSelectedFact(null)}
        >
          <button
            onClick={() => setSelectedFact(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ×
          </button>
          <div
            className="max-w-lg w-full bg-gray-800 rounded-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Image if available */}
            {selectedFact.image_key && (
              <div className="relative h-64 bg-gray-700">
                <img
                  src={getQuizImageUrl(selectedFact.image_key)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-4xl">
                  {getCategoryIcon(selectedFact.category)}
                </span>
                <div className="flex-1">
                  <p className="text-white text-lg leading-relaxed">
                    {selectedFact.fact_is}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="bg-purple-600 text-white px-3 py-1 rounded">
                  {selectedFact.category}
                </span>
                {selectedFact.seen && (
                  <span className="bg-green-600 text-white px-3 py-1 rounded">
                    ✓ Lesið
                  </span>
                )}
              </div>

              {selectedFact.seen && selectedFact.seen_at && (
                <p className="text-gray-400 text-xs mt-3">
                  Lesið: {new Date(selectedFact.seen_at * 1000).toLocaleString('is-IS')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
