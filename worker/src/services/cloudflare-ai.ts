import type { Ai } from '@cloudflare/workers-types';

const SYSTEM_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið á höfuðborgarsvæðinu).

TUNNUR:
- paper: Pappír og pappi (blá tunna) - hreinir pappírspokar, dagblöð, tímarit, pappakassar
- plastic: Plastumbúðir OG LITLAR málmumbúðir (græn tunna) - plastflöskur, plastpokar, álpappír, bjórdósir, niðursuðudósir
- food: Matarleifar (brún tunna) - skal vera í pappírspoka, ekkert plast!
- mixed: Blandaður úrgangur (grá tunna) - allt sem fer ekki annað
- recycling_center: Endurvinnslustöð - gler, rafhlöður, raftæki, föt, STÓRIR málmhlutir

MIKILVÆGAR REGLUR (VERÐUR AÐ FYLGJA):
1. 3D prentað plast (PLA, ABS, PETG) → mixed (ALLTAF! SORPA getur ekki unnið)
2. Líffræðilegt plast, "compostable" merkt → mixed (engin iðnaðarúrvinnsla á Íslandi)
3. TetraPak, mjólkurfernur, safafernur → paper (sent til Svíþjóðar)
4. Gler, keramik, postulín → recycling_center
5. Frauðplast (styrofoam, flamingó) → recycling_center (mengar plastendurvinnslu)
6. Rafhlöður → recycling_center
7. Fitubleyttur pappír, pizzakassar með fitu → mixed (fita eyðileggur pappírsendurvinnslu)
8. Plastpokar frá Bónus/Krónan → plastic
9. Pantflöskur → recycling_center (pantskil, ekki tunna)
10. STÓRIR málmhlutir (rammar, verkfæri, járn, kopar, eir/brons) → recycling_center (EKKI græna tunnan!)
11. LITLAR málmumbúðir (dósir, lok, álpappír) → plastic (græn tunna)

VARÚÐ: Ekki rugla saman málmi og plasti! Rammar, verkfæri og stórir málmhlutir eru EKKI plast.

Skoðaðu myndina og svaraðu EINGÖNGU með JSON (ekkert annað):
{"item":"nafn á íslensku (t.d. Gosdós, Mjólkurferja)","bin":"paper|plastic|food|mixed|recycling_center","reason":"náttúruleg íslensk setning með réttum fallbeygingum (t.d. 'Þetta setur þú í grænu tunnuna með öðru plasti!' eða 'Pappann brýtur þú saman og setur í bláu tunnuna!')","confidence":0.95}`;

export interface CloudflareAIResponse {
  item: string;
  bin: string;
  reason: string;
  confidence: number;
}

export async function classifyWithCloudflareAI(
  imageBase64: string,
  ai: Ai
): Promise<CloudflareAIResponse | null> {
  try {
    // Ensure we have a proper data URL
    let imageUrl = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    console.log('[CF-AI] Calling Llama 3.2 Vision, image size:', Math.round(imageUrl.length / 1024), 'KB');

    // Using Llava 1.5 with image input
    // Convert base64 to array
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Data);
    const imageBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      imageBytes[i] = binaryString.charCodeAt(i);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai as any).run('@cf/llava-hf/llava-1.5-7b-hf', {
      prompt: SYSTEM_PROMPT,
      image: Array.from(imageBytes),
      max_tokens: 256,
    });

    console.log('[CF-AI] Raw response:', JSON.stringify(response).substring(0, 500));

    // Extract the response text
    const text = (response as { response?: string })?.response;
    if (!text) {
      console.error('[CF-AI] No response text from Cloudflare AI');
      return null;
    }

    console.log('[CF-AI] Response text:', text.substring(0, 300));

    // Parse JSON from response (might have extra text around it)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('[CF-AI] No JSON found in response:', text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as CloudflareAIResponse;
    console.log('[CF-AI] Parsed result:', parsed.item, '→', parsed.bin, 'conf:', parsed.confidence);

    // Validate bin type (include deposit for consistency with Gemini)
    const validBins = ['paper', 'plastic', 'food', 'mixed', 'recycling_center', 'deposit'];
    if (!validBins.includes(parsed.bin)) {
      parsed.bin = 'mixed';
    }

    return parsed;
  } catch (error) {
    console.error('[CF-AI] Classification error:', error);
    return null;
  }
}
