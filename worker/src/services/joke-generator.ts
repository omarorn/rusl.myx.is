// Joke generator service - generates AI jokes based on recent scans

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const GEMINI_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

interface RecentScan {
  item: string;
  bin: string;
}

export interface JokeResponse {
  joke: string;
  basedOn: string[];
  generatedAt: string;
  backgroundUrl?: string; // URL to generated background image
}

export async function generateJokeFromScans(
  recentScans: RecentScan[],
  apiKey: string
): Promise<JokeResponse | null> {
  try {
    if (!apiKey) {
      console.error('[JokeGenerator] No API key provided');
      return null;
    }

    if (recentScans.length === 0) {
      return {
        joke: 'Engir hlutir hafa verið skannaðir ennþá! Byrjaðu að skanna og fáðu brandara.',
        basedOn: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // Get unique items for the prompt
    const uniqueItems = [...new Set(recentScans.map(s => s.item))].slice(0, 5);
    const itemList = uniqueItems.join(', ');

    const prompt = `Þú ert grínisti sem sérhæfir þig í ruslaflokkunar húmor á Íslandi.

Búðu til EINN stuttan og fyndinn brandara (pabba-brandara) á ÍSLENSKU um ruslaflokkun.
Brandarinn ætti að tengjast einhverjum af þessum hlutum sem voru skannaðir nýlega: ${itemList}

Reglur:
- Brandarinn verður að vera á íslensku
- Hann á að vera fjölskylduvænn
- Hann á að vera stuttur (1-3 setningar)
- Hann ætti að innihalda ordskýringu eða fyndna innsýn um rusl/endurvinnslu

Svaraðu AÐEINS með JSON:
{
  "joke": "brandarinn hér"
}`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9,
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
      console.error('[JokeGenerator] API error:', response.status, errorText.substring(0, 300));
      return null;
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[JokeGenerator] No text in response');
      return null;
    }

    const parsed = JSON.parse(text) as { joke: string };

    if (!parsed || !parsed.joke) {
      console.error('[JokeGenerator] Invalid parsed response');
      return null;
    }

    console.log('[JokeGenerator] Generated joke:', parsed.joke);

    return {
      joke: parsed.joke,
      basedOn: uniqueItems,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[JokeGenerator] Error:', error);
    return null;
  }
}

/**
 * Generate a stylish background image for a joke
 * @param joke - The joke text to create a background for
 * @param items - Items the joke is based on
 * @param apiKey - Gemini API key
 * @returns Base64 image data URL or null
 */
export async function generateJokeBackground(
  joke: string,
  items: string[],
  apiKey: string
): Promise<string | null> {
  try {
    if (!apiKey) {
      console.error('[JokeBackground] No API key provided');
      return null;
    }

    const itemsText = items.length > 0 ? items.join(', ') : 'recycling items';

    const prompt = `Create a fun, colorful background image for a recycling joke display.

THEME: ${itemsText}
STYLE:
- Bright, cheerful gradient background (greens, blues, or earth tones)
- Subtle recycling-themed elements (leaves, recycling symbols, nature)
- Cartoon/illustration style
- NOT realistic - use flat design or vector style
- Suitable for displaying text overlay
- Dimensions: 16:9 landscape
- Leave center area relatively simple for text

The background should feel eco-friendly, fun, and appropriate for a recycling app.
DO NOT include any text in the image.`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.8,
      },
    };

    console.log('[JokeBackground] Generating background for items:', itemsText);

    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JokeBackground] API error:', response.status, errorText.substring(0, 300));
      return null;
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

    // Find image in response parts
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        console.log('[JokeBackground] Background generated successfully');
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }

    console.error('[JokeBackground] No image in response');
    return null;
  } catch (error) {
    console.error('[JokeBackground] Error:', error);
    return null;
  }
}
