import type { GeminiResponse, BinType } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið).

TUNNUR:
- paper: Pappír og pappi (blátt)
- plastic: Plastumbúðir OG málmar (grænt)
- food: Matarleifar í pappírspoka (brúnt)
- mixed: Blandaður úrgangur (grátt)
- recycling_center: Endurvinnslustöð

MIKILVÆGAR REGLUR:
1. 3D prentað plast (PLA, ABS, PETG) → mixed (ALLTAF!)
2. Líffræðilegt plast (bioplastic) → mixed (SORPA getur ekki unnið)
3. TetraPak (mjólkurfernur, safaferur) → paper
4. Gler → recycling_center
5. Frauðplast (styrofoam) → recycling_center
6. Rafhlöður → recycling_center
7. Mengaður pappír (fitublettur) → mixed

Svaraðu AÐEINS með JSON:
{
  "item": "nafn hlutarins á íslensku",
  "bin": "paper|plastic|food|mixed|recycling_center",
  "reason": "stutt skýring á íslensku",
  "confidence": 0.0-1.0
}`;

export async function classifyWithGemini(
  imageBase64: string,
  apiKey: string
): Promise<GeminiResponse | null> {
  try {
    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData,
            },
          },
          {
            text: SYSTEM_PROMPT + '\n\nGreindu þennan hlut og segðu mér í hvaða tunnu hann á að fara.',
          },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    
    // Extract text from Gemini response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return null;
    }
    
    // Parse JSON response
    const parsed = JSON.parse(text) as GeminiResponse;
    
    // Validate bin type
    const validBins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
    if (!validBins.includes(parsed.bin as BinType)) {
      parsed.bin = 'mixed';
    }
    
    return parsed;
  } catch (error) {
    console.error('Gemini classification error:', error);
    return null;
  }
}
