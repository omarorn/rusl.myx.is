// src/components/TripScreen.tsx
import { useState, useEffect } from 'react';
import type { SorpaTrip, TripItem, SorpaStation } from '../types/trip';
import { createTrip, getStations, addTripItem, completeTrip, removeTripItem, getUserHash, getUserTrips, getTrip } from '../services/api';

// SORPA bin info for display
const SORPA_BIN_INFO: Record<string, { name: string; icon: string }> = {
  pappir: { name: 'Pappír', icon: '📄' },
  pappi: { name: 'Pappi', icon: '📦' },
  plast_mjukt: { name: 'Mjúkplast', icon: '🛍️' },
  plast_hardt: { name: 'Harðplast', icon: '🧴' },
  malmar: { name: 'Málmar', icon: '🥫' },
  gler: { name: 'Gler', icon: '🫙' },
  raftaeki_smaa: { name: 'Smáraftæki', icon: '📱' },
  raftaeki_stor: { name: 'Stórraftæki', icon: '🧊' },
  spilliefni: { name: 'Spilliefni', icon: '☠️' },
  textill: { name: 'Textíll', icon: '👕' },
  gardur: { name: 'Garðaúrgangur', icon: '🌿' },
  byggingar: { name: 'Byggingarúrgangur', icon: '🧱' },
  blandadur: { name: 'Blandaður', icon: '🗑️' },
};

interface TripScreenProps {
  onScanItem: () => void;  // Callback to open scanner
  onClose: () => void;     // Callback to close trip screen
  lastScannedItem?: { item: string; bin: string; confidence: number };
}

export function TripScreen({ onScanItem, onClose, lastScannedItem }: TripScreenProps) {
  const [trip, setTrip] = useState<SorpaTrip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [stations, setStations] = useState<SorpaStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load stations and check for existing trip on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Load stations
        const stationsData = await getStations();
        setStations(stationsData.stations);

        // Check for existing active trip
        const userHash = getUserHash();
        const { trips } = await getUserTrips(userHash, 'loading');

        if (trips && trips.length > 0) {
          // Load existing trip with items
          const existingTrip = trips[0];
          const tripData = await getTrip(existingTrip.id);
          setTrip(tripData.trip);
          setItems(tripData.items || []);
        }
      } catch (err) {
        console.error('Failed to initialize:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Add last scanned item to trip
  useEffect(() => {
    if (lastScannedItem && trip?.status === 'loading') {
      handleAddItem(lastScannedItem);
    }
  }, [lastScannedItem]);

  const handleStartTrip = async () => {
    setLoading(true);
    setError(null);

    try {
      const { trip: newTrip } = await createTrip(getUserHash(), selectedStation || undefined);
      setTrip(newTrip);
      setItems([]);
    } catch (err: unknown) {
      // If 409, try to load existing trip
      const response = err as { status?: number };
      if (response?.status === 409) {
        try {
          const { trips } = await getUserTrips(getUserHash(), 'loading');
          if (trips && trips.length > 0) {
            const tripData = await getTrip(trips[0].id);
            setTrip(tripData.trip);
            setItems(tripData.items || []);
            return;
          }
        } catch {
          // Fall through to error
        }
      }
      setError('Villa við að búa til ferð');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (scannedItem: { item: string; bin: string; confidence: number }) => {
    if (!trip) return;

    try {
      const { item } = await addTripItem(trip.id, {
        itemName: scannedItem.item,
        homeBin: scannedItem.bin,
        confidence: scannedItem.confidence,
      });
      setItems(prev => [...prev, item]);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!trip) return;

    try {
      await removeTripItem(trip.id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const handleComplete = async () => {
    if (!trip) return;
    setLoading(true);

    try {
      const result = await completeTrip(trip.id);
      setTrip(prev => prev ? { ...prev, status: 'completed' } : null);
      alert(`Ferð lokið! +${result.pointsAwarded} stig`);
    } catch (err) {
      setError('Villa við að ljúka ferð');
    } finally {
      setLoading(false);
    }
  };

  // Group items by ramp
  const itemsByRamp = items.reduce((acc, item) => {
    const ramp = item.ramp_number ?? 0;
    if (!acc[ramp]) acc[ramp] = [];
    acc[ramp].push(item);
    return acc;
  }, {} as Record<number, TripItem[]>);

  // Show loading state while checking for existing trips
  if (loading && !trip) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        <header className="safe-top bg-purple-600 text-white p-3 flex items-center justify-between shadow-lg">
          <button onClick={onClose} className="text-xl p-1" title="Til baka">←</button>
          <h1 className="text-lg font-bold">🚗 Ferð á SORPA</h1>
          <div className="w-8" />
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Hleður...</p>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="h-full flex flex-col bg-gray-100">
        {/* Header */}
        <header className="safe-top bg-purple-600 text-white p-3 flex items-center justify-between shadow-lg">
          <button onClick={onClose} className="text-xl p-1" title="Til baka">←</button>
          <h1 className="text-lg font-bold">🚗 Ferð á SORPA</h1>
          <div className="w-8" /> {/* Spacer for alignment */}
        </header>

        <main className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Veldu stöð</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">Velja síðar...</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStartTrip}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Hleður...' : 'Hefja ferð'}
          </button>

          {error && <p className="text-red-500">{error}</p>}
        </main>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <header className="safe-top bg-purple-600 text-white p-3 flex items-center justify-between shadow-lg">
        <button onClick={onClose} className="text-xl p-1" title="Til baka">←</button>
        <h1 className="text-lg font-bold">
          {trip.status === 'completed' ? '✅ Ferð lokið' : '🚗 Ferð í vinnslu'}
        </h1>
        <span className="text-sm">{items.length} hlutir</span>
      </header>

      <main className="flex-1 overflow-auto p-4 space-y-4">
        {trip.status === 'loading' && (
          <button
            onClick={onScanItem}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <span>📷</span> Skanna hlut
          </button>
        )}

        {/* Items grouped by ramp */}
        <div className="space-y-4">
          {Object.entries(itemsByRamp)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([ramp, rampItems]) => (
              <div key={ramp} className="bg-white border rounded-lg p-3 shadow-sm">
                <h3 className="font-medium mb-2">
                  {Number(ramp) === 0 ? 'Opið svæði' : `Rampur ${ramp}`}
                </h3>
                <ul className="space-y-2">
                  {rampItems.map(item => {
                    const binInfo = SORPA_BIN_INFO[item.sorpa_bin] || { name: item.sorpa_bin, icon: '?' };
                    return (
                      <li key={item.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <span>{binInfo.icon}</span>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-sm text-gray-500">{binInfo.name}</p>
                          </div>
                        </div>
                        {trip.status === 'loading' && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-500 text-sm"
                          >
                            Fjarlægja
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>

        {items.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-4xl mb-2">📦</p>
            <p>Engir hlutir ennþá</p>
            <p className="text-sm">Skannaðu hluti til að bæta þeim við ferðina</p>
          </div>
        )}

        {trip.status === 'loading' && items.length > 0 && (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
          >
            {loading ? 'Hleður...' : 'Ljúka ferð'}
          </button>
        )}
      </main>
    </div>
  );
}
