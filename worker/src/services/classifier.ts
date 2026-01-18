import type { Env, ClassificationResult, BinType, Language } from '../types';
import { classifyWithGemini } from './gemini';
import {
  checkOverrides,
  getBinInfoForRegion,
  DEFAULT_REGION,
  type Language as RulesLanguage,
} from './iceland-rules';

// Check if AI response seems confused/uncertain
function isConfusedResponse(item: string | undefined, reason: string | undefined): boolean {
  if (!item || !reason) return true; // Missing data = confused

  // Terms that indicate confusion (substring match is safe for these)
  const confusedPhrases = [
    'óþekkt', 'unknown', 'unclear', 'óljóst', 'veit ekki',
    'cannot identify', 'not sure', 'might be', 'could be',
    'difficult to', 'hard to', 'cannot determine',
    '3d print', '3d prent' // Multi-word phrases
  ];

  // Short terms that need word boundary matching to avoid false positives
  // e.g., "pla" should not match "display" or "plant"
  const exactMatchTerms = ['pla', 'abs', 'petg'];

  const lowerItem = item.toLowerCase();
  const lowerReason = reason.toLowerCase();
  const combined = `${lowerItem} ${lowerReason}`;

  // Check for confused phrases (substring match)
  for (const phrase of confusedPhrases) {
    if (combined.includes(phrase)) {
      return true;
    }
  }

  // Check for exact match terms using word boundaries
  for (const term of exactMatchTerms) {
    const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (wordBoundaryRegex.test(combined)) {
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
  env: Env,
  language: Language = 'is',
  region: string = DEFAULT_REGION
): Promise<ClassificationResult> {
  console.log('[Classifier] Starting classification, image size:', Math.round(imageBase64.length / 1024), 'KB');
  console.log('[Classifier] Language:', language, 'Region:', region);

  // Use Gemini as primary (Cloudflare AI Llama 3.2 has EU restrictions)
  const geminiResult = await classifyWithGemini(imageBase64, env.GEMINI_API_KEY);
  console.log('[Classifier] Gemini result:', geminiResult ? `${geminiResult.item} (${geminiResult.confidence})` : 'null');

  if (geminiResult) {
    const override = checkOverrides(geminiResult.item);
    const bin: BinType = override || (geminiResult.bin as BinType);

    return {
      item: geminiResult.item,
      bin,
      binInfo: getBinInfoForRegion(bin, region, language as RulesLanguage),
      reason: geminiResult.reason,
      confidence: geminiResult.confidence,
      source: 'gemini',
      dadJoke: geminiResult.fun_fact,
    };
  }

  // If classification fails, return safe default
  const unknownReason = language === 'en'
    ? 'Could not identify the item. When in doubt, put it in mixed waste.'
    : 'Ekki tókst að greina hlutinn. Ef þú ert í vafa, settu í blandaðan úrgang.';

  return {
    item: language === 'en' ? 'Unknown item' : 'Óþekkt hlutur',
    bin: 'mixed',
    binInfo: getBinInfoForRegion('mixed', region, language as RulesLanguage),
    reason: unknownReason,
    confidence: 0,
    source: 'gemini',
  };
}
