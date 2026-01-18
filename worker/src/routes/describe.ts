import { Hono } from 'hono';
import type { Env } from '../types';

const describe = new Hono<{ Bindings: Env }>();

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
    const dataUrl = `data:${mimeType};base64,${imageData}`;

    // Use Cloudflare AI for description
    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
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

    const description = (response as any)?.response || 'Gat ekki lýst myndinni.';

    return c.json({
      success: true,
      description: description.trim(),
    });
  } catch (err) {
    console.error('Describe error:', err);
    return c.json({ error: 'Villa við að lýsa mynd' }, 500);
  }
});

export default describe;
