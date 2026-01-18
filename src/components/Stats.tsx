import { useEffect, useState } from 'react';
import { getStats, type UserStats } from '../services/api';
import { SponsorCard } from './SponsorCard';
import { AdSlot } from './AdSlot';

interface StatsProps {
  onClose: () => void;
}

export function Stats({ onClose }: StatsProps) {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  return (
    <div className="h-full flex flex-col p-6 safe-top safe-bottom">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tölfræði</h1>
        <button onClick={onClose} className="text-3xl">✕</button>
      </div>

      {stats ? (
        <div className="flex flex-col gap-6">
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
