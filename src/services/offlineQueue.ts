/**
 * Offline Queue Service
 * Stores classification requests when offline and syncs when back online
 */

// Offline queue item
export interface QueuedScan {
  id: string;
  image: string; // base64 (stored compressed)
  timestamp: number;
  userHash: string;
  language: string;
  region: string;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  error?: string;
}

const DB_NAME = 'rusl_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'scan_queue';
const MAX_RETRIES = 3;

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Add scan to queue
export async function queueScan(scan: Omit<QueuedScan, 'id' | 'status' | 'retries'>): Promise<string> {
  const db = await openDB();
  const id = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const item: QueuedScan = {
      ...scan,
      id,
      status: 'pending',
      retries: 0,
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// Get pending scans count
export async function getPendingCount(): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count(IDBKeyRange.only('pending'));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending scans
export async function getPendingScans(): Promise<QueuedScan[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll(IDBKeyRange.only('pending'));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Update scan status
export async function updateScanStatus(
  id: string,
  status: QueuedScan['status'],
  error?: string
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result as QueuedScan;
      if (!item) {
        reject(new Error('Item not found'));
        return;
      }

      item.status = status;
      item.retries += status === 'failed' ? 1 : 0;
      if (error) item.error = error;

      const putRequest = store.put(item);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Remove scan from queue
export async function removeScan(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all synced scans
export async function clearSynced(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        // Keep failed scans under retry limit
        const item = cursor.value as QueuedScan;
        if (item.status !== 'pending' && (item.status !== 'failed' || item.retries >= MAX_RETRIES)) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Sync all pending scans
export async function syncPendingScans(
  syncFn: (scan: QueuedScan) => Promise<boolean>,
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingScans();
  let synced = 0;
  let failed = 0;

  for (const scan of pending) {
    try {
      await updateScanStatus(scan.id, 'syncing');
      const success = await syncFn(scan);

      if (success) {
        await removeScan(scan.id);
        synced++;
      } else {
        await updateScanStatus(scan.id, 'failed', 'Sync failed');
        failed++;
      }
    } catch (err) {
      await updateScanStatus(scan.id, 'failed', String(err));
      failed++;
    }

    onProgress?.(synced, pending.length);
  }

  // Clean up old failed scans
  await clearSynced();

  return { synced, failed };
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
