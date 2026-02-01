import { Hono } from 'hono';
import type { Env } from '../types';

const describe = new Hono<{ Bindings: Env }>();

// Voice config for natural Icelandic TTS
// Puck: Upbeat, natural voice that works well for Icelandic
const TTS_VOICE = 'Puck';

// Icelandic speech instruction prefix - guides pronunciation and style
const TTS_PREFIX = `[Talaðu góða, skýra íslensku. Rólega og náttúrulega, eins og útvarpsmaður.]\n\n`;

const DESCRIBE_PROMPT = `Þú ert aðstoðarmaður sem hjálpar blindum og sjónskertum að flokka rusl á Íslandi.
Lýstu hlutnum á myndinni á íslensku í 2-3 stuttum setningum.

Einbeittu þér að:
1. Hvað er þetta (nafn hlutarins)
2. Efnið (plast, pappír, málmur, gler, o.s.frv.)
3. Í HVAÐA TUNNU á að setja þetta

FLOKKUN:
- Bláa tunnan: Pappír og pappi (hrein)
- Græna tunnan: Plastumbúðir og LITLAR málmumbúðir (dósir, álpappír)
- Brúna tunnan: Matarleifar (í pappírspoka)
- Gráa tunnan: Blandaður úrgangur, 3D prent, óhrein pappír
- Endurvinnslustöð: Gler, rafhlöður, föt, frauð, STÓRIR málmhlutir (rammar, verkfæri, járn, kopar, brons)

MIKILVÆGT: Stórir málmhlutir og rammar fara á endurvinnslustöð, EKKI í grænu tunnuna!

Svaraðu AÐEINS með lýsingunni, ekkert annað. Vertu hnitmiðaður.
Dæmi: "Bronsrammi með gleri. Þetta er málmrammi. Fer á endurvinnslustöð."`;

// POST /api/describe - Get a short description of an image for TTS
describe.post('/', async (c) => {
  const env = c.env;

  try {
    const { image } = await c.req.json<{ image: string }>();

    if (!image) {
      return c.json({ error: 'Mynd vantar' }, 400);
    }

    // Extract base64 data
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    const imageData = base64Match ? base64Match[1] : image;
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    // Use Gemini Lite for fast description (optimized for speed)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: DESCRIBE_PROMPT },
              { inline_data: { mime_type: mimeType, data: imageData } },
            ],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini describe error:', geminiResponse.status, errorText.substring(0, 200));
      return c.json({ error: 'Villa við að lýsa mynd' }, 500);
    }

    const data = await geminiResponse.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const description = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Gat ekki lýst myndinni.';

    return c.json({
      success: true,
      description: description.trim(),
    });
  } catch (err) {
    console.error('Describe error:', err);
    return c.json({ error: 'Villa við að lýsa mynd' }, 500);
  }
});

// POST /api/describe/tts - Convert text to speech using Gemini TTS
describe.post('/tts', async (c) => {
  const env = c.env;

  try {
    const { text } = await c.req.json<{ text: string }>();

    if (!text) {
      return c.json({ error: 'Texti vantar' }, 400);
    }

    // Use Gemini 2.5 Flash Latest with TTS capability
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: TTS_PREFIX + text }],
            },
          ],
          generationConfig: {
            temperature: 1,
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: TTS_VOICE,
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini TTS error:', errorText);
      return c.json({ error: 'Villa við talgervil' }, 500);
    }

    const result = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: {
              mimeType: string;
              data: string;
            };
          }>;
        };
      }>;
    };

    const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!audioData) {
      console.error('No audio data in response:', JSON.stringify(result).slice(0, 500));
      return c.json({ error: 'Ekkert hljóð búið til' }, 500);
    }

    // Return the audio as base64 with mime type
    return c.json({
      success: true,
      audio: audioData.data,
      mimeType: audioData.mimeType,
    });
  } catch (err) {
    console.error('TTS error:', err);
    return c.json({ error: 'Villa við talgervil' }, 500);
  }
});

// POST /api/describe/speak - Describe image and return audio (combined endpoint)
describe.post('/speak', async (c) => {
  const env = c.env;

  try {
    const { image } = await c.req.json<{ image: string }>();

    if (!image) {
      return c.json({ error: 'Mynd vantar' }, 400);
    }

    // Extract base64 data
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    const imageData = base64Match ? base64Match[1] : image;
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${imageData}`;

    // Step 1: Get description from Cloudflare AI
    const descResponse = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DESCRIBE_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const description = ((descResponse as any)?.response || 'Gat ekki lýst myndinni.').trim();

    // Step 2: Convert to speech using Gemini TTS with Icelandic instructions
    const ttsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: TTS_PREFIX + description }],
            },
          ],
          generationConfig: {
            temperature: 1,
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: TTS_VOICE,
                },
              },
            },
          },
        }),
      }
    );

    let audioData = null;
    let audioMimeType = 'audio/wav';

    if (ttsResponse.ok) {
      const ttsResult = await ttsResponse.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: {
                mimeType: string;
                data: string;
              };
            }>;
          };
        }>;
      };

      const audio = ttsResult.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (audio) {
        audioData = audio.data;
        audioMimeType = audio.mimeType;
      }
    }

    return c.json({
      success: true,
      description,
      audio: audioData,
      mimeType: audioMimeType,
    });
  } catch (err) {
    console.error('Speak error:', err);
    return c.json({ error: 'Villa við að lýsa og tala' }, 500);
  }
});

export default describe;
