import type { GeminiResponse, BinType, DetectedObject } from '../types';

// Using latest Gemini 2.0 Flash with thinking capabilities
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

const SYSTEM_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið).
Þú hefur dökkann húmor og elskar pabba-brandara.

TUNNUR:
- paper: Pappír og pappi (blátt) - kassar, dagblöð, umbúðir úr pappa
- plastic: Plast- og málmumbúðir (grænt) - plastflöskur, dósir, málmlok, álpappír
- food: Matarleifar í pappírspoka (brúnt)
- mixed: Blandaður úrgangur (grátt)
- recycling_center: Endurvinnslustöð - gler, stórir málmhlutir, rafhlöður

ATH: Flokkun getur verið mismunandi eftir sveitarfélögum.

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
  "item": "nafn aðalhlutarins á íslensku",
  "bin": "paper|plastic|food|mixed|recycling_center",
  "reason": "stutt skýring á íslensku",
  "confidence": 0.0-1.0,
  "fun_fact": "pabba-brandari eða fyndið fact um rusl",
  "is_wide_shot": true/false,
  "all_objects": [
    {
      "item": "nafn hlutar",
      "bin": "paper|plastic|food|mixed|recycling_center",
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

    console.log('[Gemini] Calling API, image size:', Math.round(imageData.length / 1024), 'KB');

    if (!apiKey) {
      console.error('[Gemini] No API key provided');
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
      console.error('[Gemini] API error:', response.status, errorText.substring(0, 300));
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
    const validBins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
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
