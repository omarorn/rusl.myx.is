import type { BinType, BinInfo } from '../types';

// HuggingFace model labels → Icelandic bin mapping
export const HF_LABEL_TO_BIN: Record<string, BinType> = {
  'cardboard': 'paper',
  'glass': 'recycling_center',  // Glass goes to recycling centers in Iceland
  'metal': 'plastic',           // Metal goes with plastic in SORPA system
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
  // 3D printed plastics → ALWAYS mixed waste
  'pla': 'mixed',
  'abs': 'mixed',
  'petg': 'mixed',
  '3d printed': 'mixed',
  '3d print': 'mixed',
  
  // Bioplastics → Mixed (SORPA cannot process)
  'bioplastic': 'mixed',
  'compostable plastic': 'mixed',
  'biodegradable': 'mixed',
  
  // Special cases
  'tetrapak': 'paper',
  'tetra pak': 'paper',
  'milk carton': 'paper',
  'juice carton': 'paper',
  
  // Foam → Recycling center only
  'styrofoam': 'recycling_center',
  'foam': 'recycling_center',
  'polystyrene': 'recycling_center',
  
  // Contaminated → Mixed
  'greasy cardboard': 'mixed',
  'pizza box': 'mixed',  // Usually contaminated
  'dirty paper': 'mixed',
};

// Bin information for UI
export const BIN_INFO: Record<BinType, BinInfo> = {
  paper: {
    name_is: 'Pappír og pappi',
    color: '#2563eb',
    icon: '📄',
  },
  plastic: {
    name_is: 'Plastumbúðir',
    color: '#16a34a',
    icon: '🧴',
  },
  food: {
    name_is: 'Matarleifar',
    color: '#92400e',
    icon: '🍎',
  },
  mixed: {
    name_is: 'Blandaður úrgangur',
    color: '#6b7280',
    icon: '🗑️',
  },
  recycling_center: {
    name_is: 'Endurvinnslustöð',
    color: '#7c3aed',
    icon: '♻️',
  },
};

// Check if item text contains any override keywords
export function checkOverrides(itemText: string): BinType | null {
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
export function getReasonText(item: string, bin: BinType, source: string): string {
  const binInfo = BIN_INFO[bin];
  
  // Check for special overrides
  const lowerItem = item.toLowerCase();
  
  if (lowerItem.includes('3d') || lowerItem.includes('pla') || lowerItem.includes('abs')) {
    return '3D prentað plast fer í blandaðan úrgang þar sem það blandast ekki hefðbundnu plasti við endurvinnslu.';
  }
  
  if (lowerItem.includes('tetrapak') || lowerItem.includes('mjólkurfernu')) {
    return 'TetraPak fer í pappírsflokkinn þó það sé úr mörgum efnum. Það er sent til Svíþjóðar til endurvinnslu.';
  }
  
  if (bin === 'recycling_center') {
    return `${item} þarf að fara á endurvinnslustöð. Það er ekki hægt að setja þetta í heimatunnur.`;
  }
  
  return `${item} fer í ${binInfo.name_is.toLowerCase()}.`;
}
