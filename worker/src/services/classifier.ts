import type { Env, ClassificationResult, BinType } from '../types';
import { classifyWithCloudflareAI } from './cloudflare-ai';
import { classifyWithGemini } from './gemini';
import {
  checkOverrides,
  BIN_INFO
} from './iceland-rules';

export async function classifyItem(
  imageBase64: string,
  env: Env
): Promise<ClassificationResult> {
  // Try Cloudflare AI first (fast, on-edge)
  const cfResult = await classifyWithCloudflareAI(imageBase64, env.AI);

  if (cfResult && cfResult.confidence > 0.5) {
    // Check for Iceland-specific overrides
    const override = checkOverrides(cfResult.item);
    const bin: BinType = override || (cfResult.bin as BinType);

    return {
      item: cfResult.item,
      bin,
      binInfo: BIN_INFO[bin],
      reason: cfResult.reason,
      confidence: cfResult.confidence,
      source: 'gemini', // keeping for type compat
    };
  }

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
