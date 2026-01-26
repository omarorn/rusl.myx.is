import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange, getPendingCount, syncPendingScans } from '../services/offlineQueue';
import { identifyItem } from '../services/api';

interface OfflineIndicatorProps {
  onSyncComplete?: (synced: number, failed: number) => void;
}

export function OfflineIndicator({ onSyncComplete }: OfflineIndicatorProps) {
  const [online, setOnline] = useState(isOnline());
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });

  // Monitor online status
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(setOnline);
    return unsubscribe;
  }, []);

  // Update queue count periodically
  useEffect(() => {
    const updateCount = async () => {
      try {
        const count = await getPendingCount();
        setQueueCount(count);
      } catch (err) {
        console.error('Failed to get queue count:', err);
      }
    };

    updateCount();
    const interval = setInterval(updateCount, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && queueCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [online, queueCount]);

  const handleSync = async () => {
    if (isSyncing || !online) return;

    setIsSyncing(true);
    setSyncProgress({ synced: 0, total: queueCount });

    try {
      const result = await syncPendingScans(
        async (scan) => {
          try {
            const response = await identifyItem(scan.image);
            return response.success;
          } catch {
            return false;
          }
        },
        (synced, total) => setSyncProgress({ synced, total })
      );

      setQueueCount(await getPendingCount());
      onSyncComplete?.(result.synced, result.failed);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show if online and no queue
  if (online && queueCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all ${
        online
          ? isSyncing
            ? 'bg-blue-500 text-white'
            : queueCount > 0
              ? 'bg-yellow-500 text-black'
              : 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {!online ? (
        <>
          <span className="animate-pulse">📴</span>
          <span>Ekki nettenging</span>
          {queueCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {queueCount} í biðröð
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Samstilli... {syncProgress.synced}/{syncProgress.total}</span>
        </>
      ) : queueCount > 0 ? (
        <>
          <span>☁️</span>
          <span>{queueCount} ósamstillt</span>
          <button
            onClick={handleSync}
            className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full text-xs transition-colors"
          >
            Samstilla
          </button>
        </>
      ) : (
        <>
          <span>✓</span>
          <span>Samstillt</span>
        </>
      )}
    </div>
  );
}
