import type { Env, ClassificationResult, BinType } from '../types';
import { classifyWithGemini } from './gemini';
import {
  checkOverrides,
  BIN_INFO
} from './iceland-rules';

export async function classifyItem(
  imageBase64: string,
  env: Env
): Promise<ClassificationResult> {
  // Use Gemini for classification (HF inference API deprecated)
  const geminiResult = await classifyWithGemini(imageBase64, env.GEMINI_API_KEY);

  if (geminiResult) {
    // Check for Iceland-specific overrides
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

  // If Gemini fails, return safe default
  return {
    item: 'Óþekkt hlutur',
    bin: 'mixed',
    binInfo: BIN_INFO['mixed'],
    reason: 'Ekki tókst að greina hlutinn. Ef þú ert í vafa, settu í blandaðan úrgang.',
    confidence: 0,
    source: 'gemini',
  };
}
