import type { BinType, BinInfo } from '../types';
import { REGIONS, DEFAULT_REGION, getRegionByMunicipality, type RegionInfo } from '../data/regions';

export type Language = 'is' | 'en';

// HuggingFace model labels → Icelandic bin mapping
export const HF_LABEL_TO_BIN: Record<string, BinType> = {
  'cardboard': 'paper',
  'glass': 'recycling_center',
  'metal': 'plastic',
  'paper': 'paper',
  'plastic': 'plastic',
  'trash': 'mixed',
  'battery': 'recycling_center',
  'biological': 'food',
  'clothes': 'recycling_center',
  'shoes': 'recycling_center',
  'white-glass': 'recycling_center',
  'brown-glass': 'recycling_center',
  'green-glass': 'recycling_center',
};

// Items that ALWAYS go to specific bins regardless of model output
export const ICELAND_OVERRIDES: Record<string, BinType> = {
  'pla': 'mixed',
  'abs': 'mixed',
  'petg': 'mixed',
  '3d printed': 'mixed',
  '3d print': 'mixed',
  'bioplastic': 'mixed',
  'compostable plastic': 'mixed',
  'biodegradable': 'mixed',
  'tetrapak': 'paper',
  'tetra pak': 'paper',
  'milk carton': 'paper',
  'juice carton': 'paper',
  'styrofoam': 'recycling_center',
  'foam': 'recycling_center',
  'polystyrene': 'recycling_center',
  'greasy cardboard': 'mixed',
  'pizza box': 'mixed',
  'dirty paper': 'mixed',
  'bronze': 'recycling_center',
  'brass': 'recycling_center',
  'copper': 'recycling_center',
  'iron': 'recycling_center',
  'steel frame': 'recycling_center',
  'metal frame': 'recycling_center',
  'picture frame': 'recycling_center',
  'rammi': 'recycling_center',
  'málmrammi': 'recycling_center',
  'járn': 'recycling_center',
  'kopar': 'recycling_center',
  'eir': 'recycling_center',
};

// Get bin info from regions.ts based on region and language
export function getBinInfoForRegion(
  bin: BinType,
  regionId: string = DEFAULT_REGION,
  lang: Language = 'is'
): BinInfo {
  const region = REGIONS[regionId] || REGIONS[DEFAULT_REGION];
  const binData = region.bins[bin];

  return {
    name_is: lang === 'en' ? binData.name_en : binData.name_is,
    color: binData.color,
    icon: binData.icon,
  };
}

// Legacy BIN_INFO for backwards compatibility (uses default SORPA region)
export const BIN_INFO: Record<BinType, BinInfo> = {
  paper: { name_is: 'Pappír og pappi', color: '#2563eb', icon: '📄' },
  plastic: { name_is: 'Plast- og málmumbúðir', color: '#16a34a', icon: '🧴' },
  food: { name_is: 'Matarleifar', color: '#92400e', icon: '🍎' },
  mixed: { name_is: 'Blandaður úrgangur', color: '#6b7280', icon: '🗑️' },
  recycling_center: { name_is: 'Endurvinnslustöð', color: '#7c3aed', icon: '♻️' },
};

// Get all bin info for a region
export function getAllBinInfoForRegion(
  regionId: string = DEFAULT_REGION,
  lang: Language = 'is'
): Record<BinType, BinInfo> {
  const bins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
  const result: Record<BinType, BinInfo> = {} as Record<BinType, BinInfo>;

  for (const bin of bins) {
    result[bin] = getBinInfoForRegion(bin, regionId, lang);
  }

  return result;
}

// Export region helpers
export { REGIONS, DEFAULT_REGION, getRegionByMunicipality };
export type { RegionInfo };

// Check if item text contains any override keywords
export function checkOverrides(itemText: string | undefined | null): BinType | null {
  if (!itemText) return null;
  const lowerText = itemText.toLowerCase();
  
  for (const [keyword, bin] of Object.entries(ICELAND_OVERRIDES)) {
    if (lowerText.includes(keyword)) {
      return bin;
    }
  }
  
  return null;
}

// Map HuggingFace label to Icelandic bin
export function mapLabelToBin(label: string): BinType {
  const lowerLabel = label.toLowerCase();
  return HF_LABEL_TO_BIN[lowerLabel] || 'mixed';
}

// Get reason text in Icelandic
export function getReasonText(item: string | undefined | null, bin: BinType, source: string): string {
  const binInfo = BIN_INFO[bin];
  if (!item) return `Fer í ${binInfo.name_is.toLowerCase()}.`;

  // Check for special overrides
  const lowerItem = item.toLowerCase();

  if (lowerItem.includes('3d') || lowerItem.includes('pla') || lowerItem.includes('abs')) {
    return '3D prentað plast fer í blandaðan úrgang þar sem það blandast ekki hefðbundnu plasti við endurvinnslu.';
  }

  if (lowerItem.includes('tetrapak') || lowerItem.includes('mjólkurfernu')) {
    return 'TetraPak fer í pappírsflokkinn þó það sé úr mörgum efnum. Það er sent til Svíþjóðar til endurvinnslu.';
  }

  // Large metal items → Recycling center
  if (lowerItem.includes('bronze') || lowerItem.includes('brass') || lowerItem.includes('copper') ||
      lowerItem.includes('eir') || lowerItem.includes('kopar') || lowerItem.includes('rammi') ||
      lowerItem.includes('frame') || lowerItem.includes('iron') || lowerItem.includes('járn')) {
    return 'Stórir málmhlutir og rammar fara á endurvinnslustöð. Aðeins litlar málmumbúðir (dósir, lok) fara með plasti.';
  }

  // Small metal items → Plastic bin
  if (bin === 'plastic' && (lowerItem.includes('dós') || lowerItem.includes('can') ||
      lowerItem.includes('lok') || lowerItem.includes('lid') || lowerItem.includes('ál') ||
      lowerItem.includes('alumin') || lowerItem.includes('metal') || lowerItem.includes('málm'))) {
    return 'Málmumbúðir (t.d. dósir og málmlok) fara með plastumbúðum í endurvinnslu.';
  }

  if (bin === 'recycling_center') {
    return `${item} þarf að fara á endurvinnslustöð. Það er ekki hægt að setja þetta í heimatunnur.`;
  }

  return `${item} fer í ${binInfo.name_is.toLowerCase()}.`;
}
