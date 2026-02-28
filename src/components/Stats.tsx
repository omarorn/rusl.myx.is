import { useEffect, useState } from 'react';
import {
  getStats,
  getLeaderboard,
  type UserStats,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from '../services/api';
import { SponsorCard } from './SponsorCard';
import { AdSlot } from './AdSlot';

interface StatsProps {
  onClose: () => void;
}

// Period button labels in Icelandic
const periodLabels: Record<LeaderboardPeriod, string> = {
  week: 'Vika',
  month: 'Mánuður',
  all: 'Frá upphafi',
};

export function Stats({ onClose }: StatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('all');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  // Fetch leaderboard when period changes
  useEffect(() => {
    setLoadingLeaderboard(true);
    getLeaderboard(leaderboardPeriod, 10)
      .then((response) => {
        setLeaderboard(response.leaderboard || []);
      })
      .catch((err) => {
        console.error('Failed to fetch leaderboard:', err);
        setLeaderboard([]);
      })
      .finally(() => {
        setLoadingLeaderboard(false);
      });
  }, [leaderboardPeriod]);

  // Anonymize user hash for display (show first 8 chars)
  const formatUserHash = (hash: string): string => {
    if (hash.startsWith('user_')) {
      return hash.substring(0, 12) + '...';
    }
    return hash.substring(0, 8) + '...';
  };

  return (
    <div className="h-full flex flex-col p-6 safe-top safe-bottom overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tölfræði</h1>
        <button onClick={onClose} className="text-3xl">✕</button>
      </div>

      {stats ? (
        <div className="flex flex-col gap-6">
          {/* User stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-6 text-center shadow">
              <div className="text-4xl font-bold text-green-600">{stats.total_scans}</div>
              <div className="text-gray-500">Skannanir</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow">
              <div className="text-4xl font-bold text-blue-600">{stats.total_points}</div>
              <div className="text-gray-500">Stig</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow">
              <div className="text-4xl font-bold text-orange-500">{stats.current_streak}🔥</div>
              <div className="text-gray-500">Núverandi</div>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow">
              <div className="text-4xl font-bold text-purple-600">{stats.best_streak}⭐</div>
              <div className="text-gray-500">Besta</div>
            </div>
          </div>

          {/* Leaderboard section */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Stigatafla</h2>

            {/* Period selector */}
            <div className="flex gap-2 mb-4">
              {(['week', 'month', 'all'] as LeaderboardPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setLeaderboardPeriod(period)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    leaderboardPeriod === period
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>

            {/* Leaderboard list */}
            {loadingLeaderboard ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin w-6 h-6 border-3 border-green-500 border-t-transparent rounded-full" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                Engin gögn fundust fyrir þetta tímabil
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_hash}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      index === 0
                        ? 'bg-yellow-50 border border-yellow-200'
                        : index === 1
                        ? 'bg-gray-50 border border-gray-200'
                        : index === 2
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-400">{index + 1}</span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">
                        {formatUserHash(entry.user_hash)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.total_scans} skannanir
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">{entry.total_points}</div>
                      <div className="text-xs text-gray-500">stig</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad slot */}
          <AdSlot placement="stats_card" />

          {/* Sponsors */}
          <SponsorCard />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
