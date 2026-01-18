import type { Env, ClassificationResult, BinType } from '../types';
import { classifyWithCloudflareAI } from './cloudflare-ai';
import { classifyWithGemini } from './gemini';
import {
  checkOverrides,
  BIN_INFO
} from './iceland-rules';

// Check if AI response seems confused/uncertain
function isConfusedResponse(item: string | undefined, reason: string | undefined): boolean {
  if (!item || !reason) return true; // Missing data = confused

  const confusedTerms = [
    'óþekkt', 'unknown', 'unclear', 'óljóst', 'veit ekki',
    'cannot identify', 'not sure', 'might be', 'could be',
    'difficult to', 'hard to', 'cannot determine',
    '3d print', '3d prent', 'pla', 'abs', 'petg' // Often misidentified
  ];

  const lowerItem = item.toLowerCase();
  const lowerReason = reason.toLowerCase();

  // Check for confused terms
  for (const term of confusedTerms) {
    if (lowerItem.includes(term) || lowerReason.includes(term)) {
      return true;
    }
  }

  // Very short or generic item names suggest confusion
  if (item.length < 3 || item === 'hlutur' || item === 'item') {
    return true;
  }

  return false;
}

export async function classifyItem(
  imageBase64: string,
  env: Env
): Promise<ClassificationResult> {
  console.log('[Classifier] Starting classification, image size:', Math.round(imageBase64.length / 1024), 'KB');

  // Use Gemini as primary (Cloudflare AI Llama 3.2 has EU restrictions)
  const geminiResult = await classifyWithGemini(imageBase64, env.GEMINI_API_KEY);
  console.log('[Classifier] Gemini result:', geminiResult ? `${geminiResult.item} (${geminiResult.confidence})` : 'null');

  if (geminiResult) {
    const override = checkOverrides(geminiResult.item);
    const bin: BinType = override || (geminiResult.bin as BinType);

    return {
      item: geminiResult.item,
      bin,
      binInfo: BIN_INFO[bin],
      reason: geminiResult.reason,
      confidence: geminiResult.confidence,
      source: 'gemini',
      dadJoke: geminiResult.fun_fact,  // Pass through the dad joke
    };
  }

  // If both fail, return safe default
  return {
    item: 'Óþekkt hlutur',
    bin: 'mixed',
    binInfo: BIN_INFO['mixed'],
    reason: 'Ekki tókst að greina hlutinn. Ef þú ert í vafa, settu í blandaðan úrgang.',
    confidence: 0,
    source: 'gemini',
  };
}
