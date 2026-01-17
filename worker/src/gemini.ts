import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClassificationResult, BinType, BIN_COLORS } from './types';

const SYSTEM_PROMPT = `Þú ert íslenskur ruslaflokkari. Greindu myndina og segðu í hvaða tunnu hluturinn á að fara.

REGLUR FYRIR ÍSLAND (SORPA):
- 🔵 Pappír: dagblöð, kassar, TetraPak, umbúðapappír
- 🟢 Plast: plastflöskur, pokar, filmur, umbúðir (EKKI froðuplast, EKKI 3D print)
- 🟤 Matarleifar: matur í PAPPÍRSPOKA (ekki plastpoka)
- ⬜ Blandað: bleyjur, keramik, 3D print (PLA/ABS), bíóplast, óhreint

MIKILVÆGT:
- 3D prentað plast (PLA, ABS, PETG) → BLANDAÐ (ekki endurunnið á Íslandi)
- Bíóplast/compostable → BLANDAÐ (SORPA vinnur það ekki)
- TetraPak → PAPPÍR (þrátt fyrir að vera blandað efni)
- Froðuplast → BLANDAÐ (fer á gámastöð)
- Ef óvíst → BLANDAÐ

Svaraðu AÐEINS með JSON:
{
  "item": "nafn á hlut",
  "bin": "paper|plastic|food|mixed",
  "reason": "af hverju",
  "confidence": 0.0-1.0
}`;


export async function classifyWithGemini(
  base64Image: string,
  sveitarfelag: string,
  apiKey: string
): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

  try {
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      item: parsed.item || 'Óþekkt',
      bin: parsed.bin as BinType || 'mixed',
      bin_name_is: getBinNameIs(parsed.bin),
      confidence: parsed.confidence || 0.5,
      reason: parsed.reason || '',
      color: BIN_COLORS[parsed.bin as BinType] || BIN_COLORS.mixed,
      model_used: 'gemini-flash-lite',
    };
  } catch (error) {
    console.error('Gemini error:', error);
    return {
      item: 'Villa',
      bin: 'mixed',
      bin_name_is: 'Blandaður úrgangur',
      confidence: 0,
      reason: 'Gat ekki greint mynd.',
      color: BIN_COLORS.mixed,
      model_used: 'gemini-flash-lite',
    };
  }
}


function getBinNameIs(bin: string): string {
  const names: Record<string, string> = {
    paper: 'Pappír og pappi',
    plastic: 'Plastumbúðir',
    food: 'Matarleifar',
    mixed: 'Blandaður úrgangur',
  };
  return names[bin] || 'Blandaður úrgangur';
}
