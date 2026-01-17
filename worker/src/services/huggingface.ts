import type { HFClassification } from '../types';

const HF_MODEL = 'watersplash/waste-classification';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

export interface HFResult {
  label: string;
  score: number;
  allLabels: HFClassification[];
}

export async function classifyWithHuggingFace(
  imageBase64: string,
  apiKey: string
): Promise<HFResult | null> {
  try {
    // Convert base64 to blob
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryData,
    });
    
    if (!response.ok) {
      console.error('HuggingFace API error:', response.status, await response.text());
      return null;
    }
    
    const results: HFClassification[] = await response.json();
    
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return {
      label: results[0].label,
      score: results[0].score,
      allLabels: results,
    };
  } catch (error) {
    console.error('HuggingFace classification error:', error);
    return null;
  }
}
