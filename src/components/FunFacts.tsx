import { useState, useEffect } from 'react';
import { getAllFunFacts, getFunFactDetail, getQuizImageUrl, markFunFactSeen, type FunFact } from '../services/api';

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
  const [showOriginal, setShowOriginal] = useState(false);
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

  const getBinBadge = (bin: string) => {
    const bins: Record<string, { label: string; icon: string; color: string }> = {
      paper: { label: 'Pappír', icon: '📦', color: 'bg-blue-500' },
      plastic: { label: 'Plast/Málmur', icon: '🥤', color: 'bg-green-500' },
      food: { label: 'Matur', icon: '🍎', color: 'bg-amber-600' },
      mixed: { label: 'Blandað', icon: '🗑️', color: 'bg-gray-500' },
      recycling_center: { label: 'Endurvinnslustöð', icon: '♻️', color: 'bg-purple-500' },
      deposit: { label: 'Skilagjald', icon: '💰', color: 'bg-pink-600' },
    };
    return bins[bin] || { label: bin, icon: '💡', color: 'bg-gray-600' };
  };

  const openFact = async (fact: FunFact) => {
    setSelectedFact(fact);
    setShowOriginal(false);

    // Best-effort: enrich with joke metadata (doesn't block UI)
    try {
      const detail = await getFunFactDetail(fact.id);
      if (detail?.success && detail.fact) {
        setSelectedFact((prev) => (prev && prev.id === fact.id ? { ...prev, ...detail.fact } : prev));
      }
    } catch {
      // ignore
    }

    if (!fact.seen) {
      // Mark as seen (best-effort)
      try {
        await markFunFactSeen(userHash, fact.id);
        await loadFunFacts();
      } catch {
        // ignore
      }
    }
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
                onClick={() => openFact(fact)}
                className={`bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-purple-500 ${
                  fact.seen ? 'opacity-70' : ''
                }`}
              >
                {/* Image: prefer icon; show original only in modal */}
                <div className="relative bg-gray-700 h-40">
                  <img
                    src={getQuizImageUrl(fact.icon_key || fact.image_key)}
                    alt={fact.item}
                    className={`w-full h-full ${fact.icon_key ? 'object-contain bg-white' : 'object-cover'}`}
                  />

                  {fact.seen && (
                    <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                      ✓ Lesið
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-semibold truncate">{fact.item}</p>
                        <span className="text-xs text-gray-400">{Math.round(fact.confidence * 100)}%</span>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed mt-1">{fact.reason}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span className={`px-2 py-1 rounded text-white ${getBinBadge(fact.bin).color}`}>
                          {getBinBadge(fact.bin).icon} {getBinBadge(fact.bin).label}
                        </span>
                        {fact.seen && fact.seen_at && (
                          <span>{new Date(fact.seen_at * 1000).toLocaleDateString('is-IS')}</span>
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
            {/* Icon by default; tap button to reveal original */}
            <div className="bg-gray-700">
              <div className={`h-64 ${selectedFact.icon_key ? 'bg-white' : ''}`}>
                <img
                  src={getQuizImageUrl(
                    selectedFact.icon_key
                      ? (showOriginal ? selectedFact.image_key : selectedFact.icon_key)
                      : selectedFact.image_key
                  )}
                  alt={selectedFact.item}
                  className="w-full h-full object-contain"
                />
              </div>

              {selectedFact.icon_key && (
                <div className="p-3 bg-gray-800 border-t border-gray-700 flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    {showOriginal ? 'Upprunaleg mynd' : 'Íkon'}
                  </div>
                  <button
                    onClick={() => setShowOriginal((v) => !v)}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-sm"
                  >
                    {showOriginal ? 'Sýna íkon' : 'Sýna upprunalegu mynd'}
                  </button>
                </div>
              )}
            </div>

            {(selectedFact.joke_text || selectedFact.joke_key) && (
              <div className="p-4 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-2">Brandari</h3>
                {selectedFact.joke_text && (
                  <p className="text-gray-200 text-sm leading-relaxed">{selectedFact.joke_text}</p>
                )}
                {selectedFact.joke_key && (
                  <div className="mt-3 bg-gray-900 rounded-lg overflow-hidden">
                    <img
                      src={getQuizImageUrl(selectedFact.joke_key)}
                      alt="Brandara bakgrunnur"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-lg font-bold leading-relaxed">{selectedFact.item}</p>
                    <span className="text-sm text-gray-300">{Math.round(selectedFact.confidence * 100)}%</span>
                  </div>
                  <p className="text-gray-200 text-base leading-relaxed mt-2">{selectedFact.reason}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className={`text-white px-3 py-1 rounded ${getBinBadge(selectedFact.bin).color}`}>
                  {getBinBadge(selectedFact.bin).icon} {getBinBadge(selectedFact.bin).label}
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
