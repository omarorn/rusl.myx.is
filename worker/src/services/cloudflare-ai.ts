import type { Ai } from '@cloudflare/workers-types';

const SYSTEM_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið á höfuðborgarsvæðinu).

TUNNUR:
- paper: Pappír og pappi (blá tunna) - hreinir pappírspokar, dagblöð, tímarit, pappakassar
- plastic: Plastumbúðir OG málmar (græn tunna) - plastflöskur, plastpokar, álpappír, dósir
- food: Matarleifar (brún tunna) - skal vera í pappírspoka, engin plast!
- mixed: Blandaður úrgangur (grá tunna) - allt sem fer ekki annað
- recycling_center: Endurvinnslustöð - gler, rafhlöður, raftæki, föt, málning

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

Skoðaðu myndina og svaraðu EINGÖNGU með JSON (ekkert annað):
{"item":"nafn á íslensku","bin":"paper|plastic|food|mixed|recycling_center","reason":"stutt skýring á íslensku","confidence":0.95}`;

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

    const response = await ai.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0.1,
    });

    // Extract the response text
    const text = (response as { response?: string })?.response;
    if (!text) {
      console.error('No response from Cloudflare AI');
      return null;
    }

    // Parse JSON from response (might have extra text around it)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as CloudflareAIResponse;

    // Validate bin type
    const validBins = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
    if (!validBins.includes(parsed.bin)) {
      parsed.bin = 'mixed';
    }

    return parsed;
  } catch (error) {
    console.error('Cloudflare AI classification error:', error);
    return null;
  }
}
