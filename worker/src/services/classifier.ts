import type { Env, ClassificationResult, BinType } from '../types';
import { classifyWithHuggingFace } from './huggingface';
import { classifyWithGemini } from './gemini';
import { 
  checkOverrides, 
  mapLabelToBin, 
  getReasonText, 
  BIN_INFO 
} from './iceland-rules';

const CONFIDENCE_THRESHOLD = 0.80;

export async function classifyItem(
  imageBase64: string,
  env: Env
): Promise<ClassificationResult> {
  // Step 1: Try HuggingFace first (faster, cheaper)
  const hfResult = await classifyWithHuggingFace(imageBase64, env.HF_API_KEY);
  
  if (hfResult && hfResult.score >= CONFIDENCE_THRESHOLD) {
    // Check for Iceland-specific overrides
    const override = checkOverrides(hfResult.label);
    const bin: BinType = override || mapLabelToBin(hfResult.label);
    
    return {
      item: hfResult.label,
      bin,
      binInfo: BIN_INFO[bin],
      reason: getReasonText(hfResult.label, bin, 'huggingface'),
      confidence: hfResult.score,
      source: 'huggingface',
    };
  }
  
  // Step 2: Fallback to Gemini for low confidence or HF failure
  const geminiResult = await classifyWithGemini(imageBase64, env.GEMINI_API_KEY);
  
  if (geminiResult) {
    const bin = geminiResult.bin as BinType;
    
    return {
      item: geminiResult.item,
      bin,
      binInfo: BIN_INFO[bin],
      reason: geminiResult.reason,
      confidence: geminiResult.confidence,
      source: 'gemini',
    };
  }
  
  // Step 3: If both fail, return safe default
  return {
    item: 'Óþekkt hlutur',
    bin: 'mixed',
    binInfo: BIN_INFO['mixed'],
    reason: 'Ekki tókst að greina hlutinn. Ef þú ert í vafa, settu í blandaðan úrgang.',
    confidence: 0,
    source: 'huggingface',
  };
}
