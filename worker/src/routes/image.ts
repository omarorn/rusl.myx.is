import { Hono } from 'hono';
import type { Env } from '../types';
import { generateCartoonImage, cropImage } from '../services/image-gen';

const image = new Hono<{ Bindings: Env }>();

// POST /api/image/cartoon - Generate cartoon version of an image
image.post('/cartoon', async (c) => {
  const env = c.env;

  try {
    const { image: imageBase64, style } = await c.req.json<{
      image: string;
      style?: 'cute' | 'comic' | 'anime';
    }>();

    if (!imageBase64) {
      return c.json({ error: 'Mynd vantar' }, 400);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'API lykill vantar' }, 500);
    }

    const result = await generateCartoonImage(imageBase64, apiKey, style || 'cute');

    if (!result.success) {
      return c.json({ error: result.error || 'Villa við að búa til teiknimynd' }, 500);
    }

    return c.json({
      success: true,
      cartoonImage: result.cartoonImage,
    });
  } catch (err) {
    console.error('Cartoon generation error:', err);
    return c.json({ error: 'Villa við að búa til teiknimynd' }, 500);
  }
});

// POST /api/image/crop - Crop an image based on normalized coordinates
image.post('/crop', async (c) => {
  try {
    const { image: imageBase64, cropBox } = await c.req.json<{
      image: string;
      cropBox: { x: number; y: number; width: number; height: number };
    }>();

    if (!imageBase64) {
      return c.json({ error: 'Mynd vantar' }, 400);
    }

    if (!cropBox) {
      return c.json({ error: 'Crop box vantar' }, 400);
    }

    const result = await cropImage(imageBase64, cropBox);

    if (!result.success) {
      return c.json({ error: result.error || 'Villa við að klippa mynd' }, 500);
    }

    return c.json({
      success: true,
      croppedImage: result.croppedImage,
    });
  } catch (err) {
    console.error('Crop error:', err);
    return c.json({ error: 'Villa við að klippa mynd' }, 500);
  }
});

export default image;
