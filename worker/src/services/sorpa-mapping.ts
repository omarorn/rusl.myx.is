// worker/src/services/sorpa-mapping.ts
import type { BinType, SorpaBinType, SorpaBinInfo } from '../types';

// SORPA bin metadata
export const SORPA_BINS: Record<SorpaBinType, SorpaBinInfo> = {
  pappir: { type: 'pappir', name_is: 'Pappír', icon: '📄', typical_ramp: 1 },
  pappi: { type: 'pappi', name_is: 'Pappi og karton', icon: '📦', typical_ramp: 1 },
  plast_mjukt: { type: 'plast_mjukt', name_is: 'Mjúkplast', icon: '🛍️', typical_ramp: 1 },
  plast_hardt: { type: 'plast_hardt', name_is: 'Harðplast', icon: '🧴', typical_ramp: 1 },
  malmar: { type: 'malmar', name_is: 'Málmar', icon: '🥫', typical_ramp: 2 },
  gler: { type: 'gler', name_is: 'Gler og postulín', icon: '🫙', typical_ramp: 2 },
  raftaeki_smaa: { type: 'raftaeki_smaa', name_is: 'Smáraftæki', icon: '📱', typical_ramp: 3 },
  raftaeki_stor: { type: 'raftaeki_stor', name_is: 'Stórraftæki', icon: '🧊', typical_ramp: null },
  spilliefni: { type: 'spilliefni', name_is: 'Spilliefni', icon: '☠️', typical_ramp: 3 },
  textill: { type: 'textill', name_is: 'Textíll', icon: '👕', typical_ramp: 2 },
  gardur: { type: 'gardur', name_is: 'Garðaúrgangur', icon: '🌿', typical_ramp: null },
  byggingar: { type: 'byggingar', name_is: 'Byggingarúrgangur', icon: '🧱', typical_ramp: null },
  blandadur: { type: 'blandadur', name_is: 'Blandaður', icon: '🗑️', typical_ramp: 1 },
};

/**
 * Map a classified item to a SORPA bin
 * @param item - Item name (Icelandic)
 * @param homeBin - Home bin classification
 * @returns SORPA bin type
 */
export function mapToSorpaBin(item: string, homeBin: BinType): SorpaBinType {
  const itemLower = item.toLowerCase();

  // Glass detection
  if (homeBin === 'recycling_center') {
    if (itemLower.match(/gler|flaska|krukka|postulín|keramik/)) {
      return 'gler';
    }
    if (itemLower.match(/rafhlöð|batterí/)) {
      return 'spilliefni';
    }
    if (itemLower.match(/föt|klæði|skór|teppi/)) {
      return 'textill';
    }
  }

  // Electronics detection
  if (itemLower.match(/sími|símahleðslu|tölva|tablet|ipad|mús|lyklaborð|heyrnartól/)) {
    return 'raftaeki_smaa';
  }
  if (itemLower.match(/sjónvarp|þvottavél|þurrkari|ísskáp|ofn|eldavél/)) {
    return 'raftaeki_stor';
  }

  // Paper vs Cardboard distinction
  if (homeBin === 'paper') {
    if (itemLower.match(/kassi|pappi|umbúð|kassa|box/)) {
      return 'pappi';
    }
    return 'pappir';
  }

  // Plastic: soft vs hard
  if (homeBin === 'plastic') {
    if (itemLower.match(/poki|poka|filma|umbúða|mjúk|plastpoki/)) {
      return 'plast_mjukt';
    }
    if (itemLower.match(/dós|ál|málm|tin|can/)) {
      return 'malmar';
    }
    return 'plast_hardt';
  }

  // Food waste → Garden at SORPA
  if (homeBin === 'food') {
    return 'gardur';
  }

  // Hazardous materials
  if (itemLower.match(/málning|olía|lyf|efna|bensín|þynni|rafhlöð/)) {
    return 'spilliefni';
  }

  // Textiles
  if (itemLower.match(/föt|klæði|skór|teppi|tjald|koddi|sæng/)) {
    return 'textill';
  }

  // Construction
  if (itemLower.match(/viður|planki|gips|flís|steinefni|málm|pípa/)) {
    return 'byggingar';
  }

  // Default: mixed
  return 'blandadur';
}

/**
 * Get bin info for display
 */
export function getSorpaBinInfo(binType: SorpaBinType): SorpaBinInfo {
  return SORPA_BINS[binType] || SORPA_BINS.blandadur;
}

/**
 * Group items by ramp number for route optimization
 */
export function groupItemsByRamp(items: Array<{ sorpa_bin: SorpaBinType }>): Map<number | null, typeof items> {
  const groups = new Map<number | null, typeof items>();

  for (const item of items) {
    const ramp = SORPA_BINS[item.sorpa_bin]?.typical_ramp ?? null;
    if (!groups.has(ramp)) {
      groups.set(ramp, []);
    }
    groups.get(ramp)!.push(item);
  }

  return groups;
}
