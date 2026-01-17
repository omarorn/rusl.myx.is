import { ClassificationResult, BinType, BIN_COLORS } from './types';

// TrashNet categories mapped to Iceland bins
const TRASHNET_TO_BIN: Record<string, BinType> = {
  cardboard: 'paper',
  glass: 'mixed',      // Glass goes to recycling center in Iceland
  metal: 'plastic',    // Metal cans go with plastic in SORPA
  paper: 'paper',
  plastic: 'plastic',
  trash: 'mixed',
};

const BIN_NAMES_IS: Record<BinType, string> = {
  paper: 'Pappír og pappi',
  plastic: 'Plastumbúðir',
  food: 'Matarleifar',
  mixed: 'Blandaður úrgangur',
};

export async function classifyWithHuggingFace(
  base64Image: string,
  sveitarfelag: string,
  apiKey: string
): Promise<ClassificationResult> {
  // Using watersplash/waste-classification model
  const HF_MODEL = 'watersplash/waste-classification';
  
  try {
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: binaryData,
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    const results = await response.json() as Array<{ label: string; score: number }>;
    
    if (!results || results.length === 0) {
      throw new Error('No classification results');
    }

    const top = results[0];
    const bin = TRASHNET_TO_BIN[top.label.toLowerCase()] || 'mixed';

    return {
      item: top.label,
      bin,
      bin_name_is: BIN_NAMES_IS[bin],
      confidence: top.score,
      reason: `Greint sem ${top.label} (${Math.round(top.score * 100)}% viss)`,
      color: BIN_COLORS[bin],
      model_used: 'huggingface-trashnet',
    };
  } catch (error) {
    console.error('HuggingFace error:', error);
    throw error; // Let caller handle fallback
  }
}
