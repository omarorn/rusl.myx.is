// src/components/TripScreen.tsx
import { useState, useEffect } from 'react';
import type { SorpaTrip, TripItem, SorpaStation } from '../types/trip';
import { createTrip, getStations, addTripItem, completeTrip, removeTripItem, getUserHash } from '../services/api';

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
  lastScannedItem?: { item: string; bin: string; confidence: number };
}

export function TripScreen({ onScanItem, lastScannedItem }: TripScreenProps) {
  const [trip, setTrip] = useState<SorpaTrip | null>(null);
  const [items, setItems] = useState<TripItem[]>([]);
  const [stations, setStations] = useState<SorpaStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stations on mount
  useEffect(() => {
    getStations().then(data => setStations(data.stations)).catch(() => {});
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
    } catch (err) {
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

  if (!trip) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Ferð á SORPA</h2>

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
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {trip.status === 'completed' ? 'Ferð lokið' : 'Ferð í vinnslu'}
        </h2>
        <span className="text-sm text-gray-500">{items.length} hlutir</span>
      </div>

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
            <div key={ramp} className="border rounded-lg p-3">
              <h3 className="font-medium mb-2">
                {Number(ramp) === 0 ? 'Opið svæði' : `Rampur ${ramp}`}
              </h3>
              <ul className="space-y-2">
                {rampItems.map(item => {
                  const binInfo = SORPA_BIN_INFO[item.sorpa_bin] || { name: item.sorpa_bin, icon: '❓' };
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

      {trip.status === 'loading' && items.length > 0 && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-medium"
        >
          {loading ? 'Hleður...' : 'Ljúka ferð'}
        </button>
      )}
    </div>
  );
}
