import { Municipality } from '../types';

// Simple bounding boxes for Icelandic municipalities
const MUNICIPALITY_BOUNDS: Record<Municipality, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  reykjavik: { minLat: 64.08, maxLat: 64.18, minLng: -22.05, maxLng: -21.75 },
  kopavogur: { minLat: 64.05, maxLat: 64.12, minLng: -21.95, maxLng: -21.80 },
  hafnarfjordur: { minLat: 64.02, maxLat: 64.08, minLng: -22.05, maxLng: -21.90 },
  gardabaer: { minLat: 64.05, maxLat: 64.10, minLng: -22.00, maxLng: -21.88 },
  akureyri: { minLat: 65.60, maxLat: 65.72, minLng: -18.20, maxLng: -18.00 },
  other: { minLat: 0, maxLat: 90, minLng: -180, maxLng: 180 },
};

export async function getMunicipality(lat: number, lng: number): Promise<Municipality> {
  // Check each municipality
  for (const [name, bounds] of Object.entries(MUNICIPALITY_BOUNDS)) {
    if (name === 'other') continue;
    
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return name as Municipality;
    }
  }
  
  // Default to Reykjavik for capital area, otherwise other
  if (lat >= 63.9 && lat <= 64.3 && lng >= -22.2 && lng <= -21.5) {
    return 'reykjavik'; // Greater Reykjavik area uses SORPA
  }
  
  return 'other';
}

// Get municipality config for rules
export function getMunicipalityConfig(municipality: Municipality) {
  const configs: Record<Municipality, { system: string; home_bins: string[] }> = {
    reykjavik: { system: 'sorpa', home_bins: ['paper', 'plastic', 'food', 'mixed'] },
    kopavogur: { system: 'sorpa', home_bins: ['paper', 'plastic', 'food', 'mixed'] },
    hafnarfjordur: { system: 'sorpa', home_bins: ['paper', 'plastic', 'food', 'mixed'] },
    gardabaer: { system: 'sorpa', home_bins: ['paper', 'plastic', 'food', 'mixed'] },
    akureyri: { system: 'akureyri', home_bins: ['food'] }, // Only organic at home
    other: { system: 'sorpa', home_bins: ['paper', 'plastic', 'food', 'mixed'] },
  };
  
  return configs[municipality];
}
