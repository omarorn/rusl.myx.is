import type { GeminiResponse, BinType, DetectedObject } from '../types';

// Using Gemini 2.0 Flash Exp (more reliable quota)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Gemini 2.5 Flash Image for icon generation
const GEMINI_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

const SYSTEM_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið).
Þú hefur dökkann húmor og elskar pabba-brandara.

TUNNUR:
- paper: Pappír og pappi (blátt) - kassar, dagblöð, umbúðir úr pappa
- plastic: Plast- og málmumbúðir (grænt) - plastflöskur, dósir, málmlok, álpappír
- food: Matarleifar í pappírspoka (brúnt)
- mixed: Blandaður úrgangur (grátt)
- recycling_center: Endurvinnslustöð - gler, stórir málmhlutir, rafhlöður
- deposit: Skilagjald (Endurvinnslan) 🐷 - drykkjarvöruumbúðir með skilagjald

ATH: Flokkun getur verið mismunandi eftir sveitarfélögum.

SKILAGJALD (MIKILVÆGT!):
- Allar dósir og flöskur með skilagjald → deposit
- Gosdósir (Coca-Cola, Pepsi, Sprite, Fanta, Egils) → deposit
- Bjórdósir (Víking, Gull, Thule, Tuborg, Carlsberg) → deposit
- Orkudrykkir (Red Bull, Monster) → deposit
- PET vatnsflöskur og gosflöskur → deposit
- Glerflöskur með skilagjald → deposit
- ATHUGIÐ: Flöskur mega EKKI vera krumpaðar!

MIKILVÆGAR REGLUR:
1. Pappakassar og pappírsumbúðir → paper (hrein)
2. Plastumbúðir → plastic
3. LITLAR málmumbúðir (dósir, lok) → plastic (græn tunna)
4. STÓRIR málmhlutir (rammar, járn, kopar, brons) → recycling_center
5. 3D prentað plast (PLA, ABS, PETG) → mixed (ALLTAF!)
6. Líffræðilegt plast (bioplastic) → mixed
7. TetraPak (mjólkurfernur, safafernur) → paper
8. Gler, keramik → recycling_center
9. Frauðplast (styrofoam) → recycling_center
10. Rafhlöður → recycling_center
11. Mengaður pappír (fitublettur) → mixed

ATHUGIÐ: Þegar þú sérð umbúðir (t.d. kassa utan um vörur), greindu efnið (pappír, plast) - ekki innihaldið!

VÍÐMYNDIR (WIDE SHOTS):
Ef myndin sýnir marga hluti eða stóra senu:
1. Finndu ALLA hluti sem gætu verið rusl
2. Bættu við fyndnum athugasemdum um hluti sem eru EKKI rusl
3. Tilgreindu staðsetningu aðalrruslsins (crop_box)

GRÍNSAMIR KOMMENTAR fyrir hluti sem EKKI eru rusl:
- Húsgögn: "Sófinn er of þægilegur til að henda... en ég dæmi þig ekki."
- Plöntur: "Þessi planta hefur meiri persónuleika en sumir sem ég þekki."
- Tölvur/símum: "Teknóloía - eina sem úreldist hraðar en mjólk."
- Dýr: "Þetta er lifandi! Ekki setja í ruslatunnuna (nema ef þú ert köttur, þá er allt rusl)."
- Fólk: "Homo sapiens - endurvinnanlegur í orði kveðnu, en flókið í framkvæmd."
- Matur (á disk): "Þetta er ennþá matur! Borðaðu það áður en það verður rusl."
- Leikföng: "Leikfang - eða list? Það fer eftir aldri eigandans."
- Bækur: "Bækur eru óendanlega endurnýtanlegar - það kallast LESA aftur."

SÉRSTÖK TILVIK (svaraðu með húmor):
- Ef þú sérð manneskju eða selfie: item="Manneskja", bin="mixed", reason="Fólk fer ekki í rusl... ennþá. Reyndu að skanna raunverulegan hlut!", is_trash=false, funny_comment="Selfie? Þetta app er fyrir rusl, ekki andlitsmyndir. Þó ég dæmi ekki útlitið þitt."
- Ef myndin er óskýr/tóm: item="Óþekkt", reason="Sá ekki neitt. Ertu að skanna loftið? Það er ókeypis og fer hvergi."
- Ef þú sérð gæludýr: is_trash=false, funny_comment="Ó nei nei nei! Þetta er fjölskyldumeðlimur, ekki rusl. Þó hann borði ruslið þitt."

PABBA-BRANDARI: Bættu við fyndnum "fun_fact" brandara um rusl eða endurvinnslu.

Svaraðu AÐEINS með JSON:
{
  "item": "nafn aðalhlutarins á íslensku (t.d. 'Gosdós', 'Pappakassi')",
  "bin": "paper|plastic|food|mixed|recycling_center|deposit",
  "reason": "náttúruleg íslensk setning sem útskýrir flokkun, eins og þú værir að tala við manneskju (t.d. 'Gosdósir með skilagjald skila þú í Endurvinnslan og færð peningana til baka!' eða 'Pappakassar fara í bláu tunnuna, en mundu að brjóta þá saman!')",
  "confidence": 0.0-1.0,
  "fun_fact": "stuttur pabba-brandari um rusl eða endurvinnslu á íslensku",
  "is_wide_shot": true/false,
  "all_objects": [
    {
      "item": "nafn hlutar",
      "bin": "paper|plastic|food|mixed|recycling_center|deposit",
      "reason": "skýring",
      "confidence": 0.0-1.0,
      "is_trash": true/false,
      "funny_comment": "grínsamur komment ef EKKI rusl",
      "crop_box": {"x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0}
    }
  ],
  "primary_object_index": 0
}`;

export async function classifyWithGemini(
  imageBase64: string,
  apiKey: string
): Promise<GeminiResponse | null> {
  try {
    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageSizeKB = Math.round(imageData.length / 1024);
    const hasPrefix = imageBase64.startsWith('data:image/');

    console.log('[Gemini] Calling API');
    console.log('[Gemini] Image has data URL prefix:', hasPrefix);
    console.log('[Gemini] Raw input length:', Math.round(imageBase64.length / 1024), 'KB');
    console.log('[Gemini] Cleaned image size:', imageSizeKB, 'KB');

    // Check for empty/too small images
    if (imageSizeKB < 1) {
      console.error('[Gemini] Image too small or empty:', imageSizeKB, 'KB');
      console.error('[Gemini] First 100 chars of input:', imageBase64.substring(0, 100));
      return null;
    }

    if (!apiKey) {
      console.error('[Gemini] No API key provided');
      return null;
    }

    // Validate base64 data
    try {
      // Check if it's valid base64
      const testDecode = atob(imageData.substring(0, 100));
      console.log('[Gemini] Base64 validation passed');
    } catch (e) {
      console.error('[Gemini] Invalid base64 data:', e);
      return null;
    }

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
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText.substring(0, 500));

      // Check for specific error codes
      if (response.status === 429) {
        console.error('[Gemini] QUOTA EXHAUSTED - API key has hit rate limit');
      } else if (response.status === 401 || response.status === 403) {
        console.error('[Gemini] AUTHENTICATION ERROR - API key may be invalid');
      }

      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    console.log('[Gemini] Raw response:', JSON.stringify(data).substring(0, 500));

    // Extract text from Gemini response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[Gemini] No text in response');
      return null;
    }

    console.log('[Gemini] Response text:', text.substring(0, 300));

    // Parse JSON response - handle both array and object
    let parsed: GeminiResponse;
    const jsonData = JSON.parse(text);
    if (Array.isArray(jsonData)) {
      parsed = jsonData[0] as GeminiResponse;
    } else {
      parsed = jsonData as GeminiResponse;
    }

    if (!parsed || !parsed.item) {
      console.error('[Gemini] Invalid parsed response:', jsonData);
      return null;
    }

    console.log('[Gemini] Parsed result:', parsed.item, '→', parsed.bin, 'conf:', parsed.confidence);

    // Log wide shot info if present
    if (parsed.is_wide_shot && parsed.all_objects) {
      console.log('[Gemini] Wide shot detected with', parsed.all_objects.length, 'objects');
      const nonTrash = parsed.all_objects.filter(obj => !obj.is_trash);
      if (nonTrash.length > 0) {
        console.log('[Gemini] Non-trash objects:', nonTrash.map(o => o.item).join(', '));
      }
    }

    // Validate bin type
    const validBins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center', 'deposit'];
    if (!validBins.includes(parsed.bin as BinType)) {
      parsed.bin = 'mixed';
    }

    // Validate all_objects bin types too
    if (parsed.all_objects) {
      for (const obj of parsed.all_objects) {
        if (!validBins.includes(obj.bin as BinType)) {
          obj.bin = 'mixed';
        }
      }
    }

    return parsed;
  } catch (error) {
    console.error('[Gemini] Classification error:', error);
    return null;
  }
}

// Icon generation result type
export interface IconResult {
  success: boolean;
  iconImage?: string; // base64 encoded image
  error?: string;
}

// Prompt template for generating cartoon icons (matching ruslgreinir-google pattern)
const getIconPrompt = (objectName: string) => `Create a high-quality, cute 2D vector icon of a ${objectName}.
Use the provided image as a visual reference for the object's shape and color, but isolate it completely.
White background. Thick bold outlines. Flat design. Sticker style.`;

/**
 * Generate a cartoon icon from an image using Gemini 2.5 Flash Image
 * @param imageBase64 - Base64 encoded image (with or without data URL prefix)
 * @param apiKey - Gemini API key
 * @param itemName - Item name for the icon (e.g., "Gosdós", "Pappakassi") - REQUIRED for good results
 * @returns IconResult with base64 icon image or error
 */
export async function generateIcon(
  imageBase64: string,
  apiKey: string,
  itemName: string = 'recycling item'
): Promise<IconResult> {
  try {
    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageSizeKB = Math.round(imageData.length / 1024);

    console.log('[Gemini Icon] Generating icon for:', itemName, '- image size:', imageSizeKB, 'KB');

    if (imageSizeKB < 1) {
      console.error('[Gemini Icon] Image too small:', imageSizeKB, 'KB');
      return { success: false, error: 'Image too small' };
    }

    if (!apiKey) {
      console.error('[Gemini Icon] No API key provided');
      return { success: false, error: 'No API key' };
    }

    // Use the ruslgreinir-google style prompt
    const prompt = getIconPrompt(itemName);

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
            text: prompt,
          },
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.4,
      },
    };

    console.log('[Gemini Icon] Calling API...');

    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini Icon] API error:', response.status, errorText.substring(0, 300));

      if (response.status === 429) {
        return { success: false, error: 'Rate limit exceeded' };
      } else if (response.status === 404) {
        return { success: false, error: 'Image model not available' };
      } else if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Authentication error' };
      }

      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: {
              mimeType: string;
              data: string;
            };
          }>;
        };
      }>;
    };

    console.log('[Gemini Icon] Response received');

    // Find image in response parts
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        const iconBase64 = `data:${mimeType};base64,${part.inlineData.data}`;
        console.log('[Gemini Icon] Icon generated successfully');
        return { success: true, iconImage: iconBase64 };
      }
    }

    // No image found in response
    console.error('[Gemini Icon] No image in response');
    const textResponse = parts.find(p => p.text)?.text;
    if (textResponse) {
      console.log('[Gemini Icon] Text response:', textResponse.substring(0, 200));
    }

    return { success: false, error: 'No image generated' };
  } catch (error) {
    console.error('[Gemini Icon] Generation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
