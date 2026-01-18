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
  // Try Cloudflare AI first (fast, on-edge)
  const cfResult = await classifyWithCloudflareAI(imageBase64, env.AI);

  // Check if result is good enough or if we should try Gemini
  const shouldFallback = !cfResult ||
    cfResult.confidence < 0.7 ||  // Higher threshold
    isConfusedResponse(cfResult.item, cfResult.reason);

  if (cfResult && !shouldFallback) {
    // Check for Iceland-specific overrides
    const override = checkOverrides(cfResult.item);
    const bin: BinType = override || (cfResult.bin as BinType);

    return {
      item: cfResult.item,
      bin,
      binInfo: BIN_INFO[bin],
      reason: cfResult.reason,
      confidence: cfResult.confidence,
      source: 'cloudflare',
    };
  }

  console.log('[Classifier] Falling back to Gemini:', cfResult ?
    `conf=${cfResult.confidence}, confused=${isConfusedResponse(cfResult.item, cfResult.reason)}` :
    'no CF result');

  // Fallback to Gemini for low confidence or CF failure
  const geminiResult = await classifyWithGemini(imageBase64, env.GEMINI_API_KEY);

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
