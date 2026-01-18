import { useState, useEffect, useCallback } from 'react';
import {
  getQuizQuestion,
  submitQuizAnswer,
  submitQuizScore,
  getQuizLeaderboard,
  deleteQuizScores,
  deleteQuizImages,
  getQuizDuplicates,
  deleteQuizDuplicates,
  type QuizQuestion,
  type QuizAnswer,
  type QuizScore,
} from '../services/api';

type GameMode = 'menu' | 'timed' | 'survival' | 'learning';
type GameState = 'playing' | 'feedback' | 'gameover' | 'leaderboard';

interface QuizProps {
  onClose: () => void;
}

const API_BASE = import.meta.env.PROD ? 'https://trash.myx.is' : 'http://localhost:8787';

export function Quiz({ onClose }: QuizProps) {
  const [mode, setMode] = useState<GameMode>('menu');
  const [gameState, setGameState] = useState<GameState>('playing');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [answer, setAnswer] = useState<QuizAnswer | null>(null);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<QuizScore[]>([]);
  const [streak, setStreak] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminAction, setAdminAction] = useState<'scores' | 'images' | 'duplicates' | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ item: string; bin: string; count: number }>>([]);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Load next question
  const loadQuestion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = await getQuizQuestion();
      if ('error' in q) {
        setError((q as any).error);
        return;
      }
      setQuestion(q);
      setAnswer(null);
      setGameState('playing');
    } catch (err) {
      setError('Gat ekki sótt spurningu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start game
  const startGame = useCallback((selectedMode: GameMode) => {
    setMode(selectedMode);
    setScore(0);
    setTotalQuestions(0);
    setLives(3);
    setStreak(0);
    setTimeLeft(selectedMode === 'timed' ? 60 : 0);
    setGameState('playing');
    loadQuestion();
  }, [loadQuestion]);

  // Submit answer
  const handleAnswer = async (selectedBin: string) => {
    if (!question || gameState !== 'playing') return;

    setIsLoading(true);
    try {
      const result = await submitQuizAnswer(question.id, selectedBin);
      setAnswer(result);
      setTotalQuestions(prev => prev + 1);

      if (result.correct) {
        setScore(prev => prev + result.points + (streak * 2)); // Bonus for streaks
        setStreak(prev => prev + 1);
      } else {
        setStreak(0);
        if (mode === 'survival') {
          setLives(prev => prev - 1);
        }
      }

      setGameState('feedback');

      // Auto-advance in timed mode
      if (mode === 'timed') {
        setTimeout(() => {
          if (timeLeft > 0) {
            loadQuestion();
          }
        }, 1500);
      }
    } catch (err) {
      setError('Villa við að skrá svar');
    } finally {
      setIsLoading(false);
    }
  };

  // Continue to next question (learning/survival mode)
  const handleContinue = () => {
    if (mode === 'survival' && lives <= 0) {
      endGame();
    } else {
      loadQuestion();
    }
  };

  // End game
  const endGame = async () => {
    setGameState('gameover');
    try {
      await submitQuizScore(score, totalQuestions, mode, mode === 'timed' ? 60 - timeLeft : undefined);
      const lb = await getQuizLeaderboard(mode);
      setLeaderboard(lb.scores || []);
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  };

  // Timer for timed mode
  useEffect(() => {
    if (mode !== 'timed' || gameState !== 'playing' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, gameState, timeLeft]);

  // Check for game over in survival mode
  useEffect(() => {
    if (mode === 'survival' && lives <= 0 && gameState === 'feedback') {
      setTimeout(endGame, 2000);
    }
  }, [lives, mode, gameState]);

  // Handle delete scores
  const handleDeleteScores = async () => {
    setDeleteError(null);
    try {
      const result = await deleteQuizScores(deletePassword);
      if (result.success) {
        setLeaderboard([]);
        setShowDeleteDialog(false);
        setDeletePassword('');
      } else {
        setDeleteError(result.error || 'Villa kom upp');
      }
    } catch (err) {
      setDeleteError('Villa við að eyða stigum');
    }
  };

  // Handle admin actions
  const handleAdminAction = async () => {
    setDeleteError(null);
    setAdminMessage(null);
    try {
      let result;
      if (adminAction === 'scores') {
        result = await deleteQuizScores(deletePassword);
      } else if (adminAction === 'images') {
        result = await deleteQuizImages(deletePassword);
      } else if (adminAction === 'duplicates') {
        result = await deleteQuizDuplicates(deletePassword);
      }

      if (result?.success) {
        setAdminMessage(result.message || 'Aðgerð tókst');
        setDeletePassword('');
        setAdminAction(null);
      } else {
        setDeleteError(result?.error || 'Villa kom upp');
      }
    } catch (err) {
      setDeleteError('Villa við aðgerð');
    }
  };

  // Load duplicates
  const loadDuplicates = async () => {
    try {
      const result = await getQuizDuplicates();
      if (result.success) {
        setDuplicates(result.duplicates);
      }
    } catch (err) {
      console.error('Failed to load duplicates:', err);
    }
  };

  // Menu screen
  if (mode === 'menu') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
        <header className="safe-top bg-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
          <button onClick={onClose} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">🎮 Ruslaleikur</h1>
          <div className="w-8" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-purple-800 mb-2">Hversu vel þekkir þú ruslið?</h2>
            <p className="text-purple-600">Veldu leikham og prófaðu þig!</p>
          </div>

          <button
            onClick={() => startGame('timed')}
            className="w-full max-w-xs bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-xl font-bold">Tímaþröng</div>
            <div className="text-sm opacity-80">60 sekúndur - hversu mörg nærðu?</div>
          </button>

          <button
            onClick={() => startGame('survival')}
            className="w-full max-w-xs bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-3xl mb-2">❤️❤️❤️</div>
            <div className="text-xl font-bold">Þrjú líf</div>
            <div className="text-sm opacity-80">Hversu langt kemstu?</div>
          </button>

          <button
            onClick={() => startGame('learning')}
            className="w-full max-w-xs bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-2xl shadow-lg active:scale-95 transition-transform"
          >
            <div className="text-3xl mb-2">📚</div>
            <div className="text-xl font-bold">Námshamur</div>
            <div className="text-sm opacity-80">Engin tímamörk - lærðu í þínum hraða</div>
          </button>

          {/* Admin button */}
          <button
            onClick={() => {
              setShowAdminPanel(true);
              loadDuplicates();
            }}
            className="mt-8 text-gray-400 text-sm"
          >
            ⚙️ Stjórnborð
          </button>
        </main>

        {/* Admin Panel */}
        {showAdminPanel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">⚙️ Stjórnborð</h3>
                <button
                  onClick={() => {
                    setShowAdminPanel(false);
                    setAdminAction(null);
                    setDeletePassword('');
                    setDeleteError(null);
                    setAdminMessage(null);
                  }}
                  className="text-2xl text-gray-400"
                >
                  ✕
                </button>
              </div>

              {adminMessage && (
                <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">
                  ✅ {adminMessage}
                </div>
              )}

              {/* Duplicates info */}
              {duplicates.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <div className="font-medium text-yellow-800 mb-2">
                    ⚠️ {duplicates.length} tvítekningar fundnar
                  </div>
                  <div className="text-xs text-yellow-700 max-h-24 overflow-auto">
                    {duplicates.slice(0, 5).map((d, i) => (
                      <div key={i}>{d.item} ({d.count}x)</div>
                    ))}
                    {duplicates.length > 5 && <div>...og {duplicates.length - 5} fleiri</div>}
                  </div>
                </div>
              )}

              {!adminAction ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setAdminAction('duplicates')}
                    className="w-full p-3 bg-yellow-500 text-white rounded-lg font-medium"
                  >
                    🔄 Eyða tvítekningum
                  </button>
                  <button
                    onClick={() => setAdminAction('images')}
                    className="w-full p-3 bg-orange-500 text-white rounded-lg font-medium"
                  >
                    🗑️ Eyða öllum myndum
                  </button>
                  <button
                    onClick={() => setAdminAction('scores')}
                    className="w-full p-3 bg-red-500 text-white rounded-lg font-medium"
                  >
                    🗑️ Eyða öllum stigum
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-sm mb-3">
                    {adminAction === 'duplicates' && 'Eyða tvíteknum myndum (heldur bestu)'}
                    {adminAction === 'images' && 'Eyða ÖLLUM myndum úr leik'}
                    {adminAction === 'scores' && 'Eyða ÖLLUM stigum úr stigatöflu'}
                  </p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Lykilorð"
                    className="w-full p-3 border rounded-lg mb-3"
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-red-500 text-sm mb-3">{deleteError}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setAdminAction(null);
                        setDeletePassword('');
                        setDeleteError(null);
                      }}
                      className="flex-1 p-3 bg-gray-200 rounded-lg font-medium"
                    >
                      Hætta við
                    </button>
                    <button
                      onClick={handleAdminAction}
                      className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium"
                    >
                      Staðfesta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Game over screen
  if (gameState === 'gameover') {
    const accuracy = totalQuestions > 0 ? Math.round((score / (totalQuestions * 10)) * 100) : 0;

    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
        <header className="safe-top bg-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
          <button onClick={() => setMode('menu')} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">🏆 Úrslit</h1>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {accuracy >= 80 ? '🌟' : accuracy >= 50 ? '👍' : '💪'}
            </div>
            <div className="text-4xl font-bold text-purple-800 mb-2">{score} stig</div>
            <div className="text-purple-600">
              {totalQuestions} spurningar • {accuracy}% rétt
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-purple-800">🏅 Stigatafla</h3>
                <button
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  🗑️ Eyða
                </button>
              </div>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-purple-50"
                  >
                    <span className="font-bold text-purple-600">#{i + 1}</span>
                    <span className="text-gray-600">{entry.user_hash.slice(0, 8)}...</span>
                    <span className="font-bold">{entry.score} stig</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete dialog */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                <h3 className="font-bold text-lg mb-4">🗑️ Eyða öllum stigum?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Sláðu inn lykilorð til að eyða öllum stigum.
                </p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Lykilorð"
                  className="w-full p-3 border rounded-lg mb-3"
                  autoFocus
                />
                {deleteError && (
                  <p className="text-red-500 text-sm mb-3">{deleteError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeletePassword('');
                      setDeleteError(null);
                    }}
                    className="flex-1 p-3 bg-gray-200 rounded-lg font-medium"
                  >
                    Hætta við
                  </button>
                  <button
                    onClick={handleDeleteScores}
                    className="flex-1 p-3 bg-red-500 text-white rounded-lg font-medium"
                  >
                    Eyða
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => startGame(mode)}
              className="flex-1 bg-purple-600 text-white p-4 rounded-xl font-bold active:scale-95 transition-transform"
            >
              Spila aftur
            </button>
            <button
              onClick={() => setMode('menu')}
              className="flex-1 bg-gray-200 text-gray-800 p-4 rounded-xl font-bold active:scale-95 transition-transform"
            >
              Velja ham
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
        <header className="safe-top bg-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
          <button onClick={() => setMode('menu')} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">🎮 Ruslaleikur</h1>
          <div className="w-8" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-6xl mb-4">📷</div>
          <p className="text-center text-gray-600 mb-4">{error}</p>
          <p className="text-center text-gray-500 text-sm mb-6">
            Þú þarft að skanna nokkra hluti fyrst til að byggja upp myndabanka fyrir leikinn!
          </p>
          <button
            onClick={onClose}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Fara að skanna
          </button>
        </main>
      </div>
    );
  }

  // Loading state
  if (isLoading && !question) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
        <header className="safe-top bg-purple-600 text-white p-4 flex items-center justify-between shadow-lg">
          <button onClick={() => setMode('menu')} className="text-2xl">←</button>
          <h1 className="text-xl font-bold">🎮 Ruslaleikur</h1>
          <div className="w-8" />
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  // Game screen
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-50 to-purple-100">
      {/* Header with stats */}
      <header className="safe-top bg-purple-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMode('menu')} className="text-xl">✕</button>
          <div className="text-xl font-bold">{score} stig</div>
          {mode === 'timed' && (
            <div className={`text-xl font-mono ${timeLeft <= 10 ? 'text-red-300 animate-pulse' : ''}`}>
              {timeLeft}s
            </div>
          )}
          {mode === 'survival' && (
            <div className="text-xl">
              {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
            </div>
          )}
          {mode === 'learning' && (
            <div className="text-sm">#{totalQuestions + 1}</div>
          )}
        </div>
        {streak > 1 && (
          <div className="text-center text-yellow-300 text-sm animate-pulse">
            🔥 {streak} í röð!
          </div>
        )}
      </header>

      {/* Question */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Image */}
        <div className="flex-1 relative bg-gray-900 min-h-0">
          {question && (
            <img
              src={`${API_BASE}${question.imageUrl}`}
              alt="Hvað er þetta?"
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image doesn't load
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" font-size="40">📷</text></svg>';
              }}
            />
          )}

          {/* Feedback overlay */}
          {gameState === 'feedback' && answer && (
            <div className={`absolute inset-0 flex items-center justify-center ${
              answer.correct ? 'bg-green-500/80' : 'bg-red-500/80'
            }`}>
              <div className="text-center text-white p-6">
                <div className="text-6xl mb-4">{answer.correct ? '✅' : '❌'}</div>
                <div className="text-2xl font-bold mb-2">{answer.item}</div>
                <div className="text-lg mb-2">
                  {answer.correctBinInfo.icon} {answer.correctBinInfo.name_is}
                </div>
                <div className="text-sm opacity-80 max-w-xs">{answer.reason}</div>
                {answer.correct && (
                  <div className="mt-4 text-xl font-bold">+{answer.points} stig</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Answer buttons */}
        <div className="safe-bottom bg-white p-4 shadow-lg">
          {gameState === 'playing' && question && (
            <>
              <p className="text-center text-gray-600 mb-3 font-medium">
                Í hvaða tunnu fer þetta?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option) => (
                  <button
                    key={option.bin}
                    onClick={() => handleAnswer(option.bin)}
                    disabled={isLoading}
                    className="p-3 rounded-xl font-medium text-white active:scale-95 transition-transform disabled:opacity-50"
                    style={{ backgroundColor: option.color }}
                  >
                    <span className="text-2xl block">{option.icon}</span>
                    <span className="text-sm">{option.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {gameState === 'feedback' && mode !== 'timed' && (
            <button
              onClick={handleContinue}
              className="w-full bg-purple-600 text-white p-4 rounded-xl font-bold active:scale-95 transition-transform"
            >
              {mode === 'survival' && lives <= 0 ? 'Sjá úrslit' : 'Næsta spurning →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
