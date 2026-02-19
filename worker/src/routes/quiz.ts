import { Hono } from 'hono';
import type { Env } from '../types';
import { BIN_INFO } from '../services/iceland-rules';
import { generateIcon } from '../services/gemini';
import { requireAdmin } from '../services/admin-auth';

// Safe base64 encoding that doesn't cause call stack overflow for large images
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

const quiz = new Hono<{ Bindings: Env }>();

interface QuizImage {
  id: string;
  image_key: string;
  icon_key: string | null;
  item: string;
  bin: string;
  reason: string;
  times_shown: number;
  times_correct: number;
}

interface QuizScore {
  user_hash: string;
  score: number;
  total_questions: number;
  mode: string;
  created_at: number;
}

// GET /api/quiz/image/:key - Serve quiz image from R2
quiz.get('/image/*', async (c) => {
  const env = c.env;
  // Important: keys may be URL-encoded in the path (e.g. t%C3%B6lvum%C3%BAs...),
  // while R2 may contain either encoded or decoded variants depending on how
  // the key was originally generated. Try both.
  const prefix = '/api/quiz/image/';
  const rawPath = new URL(c.req.url).pathname; // preserves percent-encoding
  const rawKey = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : c.req.path.replace(prefix, '');

  const candidateKeys = (() => {
    const keys: string[] = [];
    const add = (k: string | null | undefined) => {
      if (!k) return;
      if (!keys.includes(k)) keys.push(k);
    };

    const expand = (k: string) => {
      // Try exactly as-is first
      add(k);

      // Also try toggling the common "quiz/" prefix since some stored keys are
      // relative (icons/...) while others are full (quiz/icons/...).
      if (k.startsWith('quiz/')) {
        add(k.slice('quiz/'.length));
      } else if (k.startsWith('icons/') || k.startsWith('jokes/') || k.startsWith('funfacts/')) {
        add(`quiz/${k}`);
      }
    };

    // Raw path key (keeps percent-encoding)
    expand(rawKey);

    // Decoded variant (if valid)
    try {
      const decoded = decodeURIComponent(rawKey);
      if (decoded && decoded !== rawKey) expand(decoded);
    } catch {
      // Ignore malformed percent-encoding
    }

    return keys;
  })();

  try {
    let object: R2ObjectBody | null = null;
    let foundKey: string | null = null;

    for (const key of candidateKeys) {
      // eslint-disable-next-line no-await-in-loop
      const candidate = await env.IMAGES.get(key);
      if (candidate) {
        object = candidate;
        foundKey = key;
        break;
      }
    }

    if (!object) {
      // Fun facts currently use image_key placeholders; return a lightweight placeholder
      // instead of spamming 404s until real assets exist in R2.
      const placeholderKey = (() => {
        for (const k of candidateKeys) {
          if (k.startsWith('funfacts/')) return k;
          try {
            const decoded = decodeURIComponent(k);
            if (decoded.startsWith('funfacts/')) return decoded;
          } catch {
            // ignore
          }
        }
        return null;
      })();

      if (placeholderKey) {
        const label = placeholderKey
          .replace(/^funfacts\//, '')
          .replace(/^illustration_/, '')
          .replace(/\.png$/i, '')
          .replace(/_/g, ' ')
          .trim();

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22c55e"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#g)"/>
  <circle cx="256" cy="210" r="96" fill="rgba(255,255,255,0.25)"/>
  <text x="256" y="340" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="28" font-weight="700" fill="#fff">
    Fun fact
  </text>
  <text x="256" y="382" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-size="18" fill="rgba(255,255,255,0.9)">
    ${label}
  </text>
</svg>`;

        const headers = new Headers();
        headers.set('Content-Type', 'image/svg+xml; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=3600'); // 1h
        return new Response(svg, { headers, status: 200 });
      }

      return c.json({ error: 'Mynd fannst ekki', keyTried: candidateKeys }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    if (foundKey && foundKey !== rawKey) {
      headers.set('X-Resolved-R2-Key', foundKey);
    }

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Quiz image error:', err);
    return c.json({ error: 'Villa við að sækja mynd' }, 500);
  }
});

// GET /api/quiz/random - Get random quiz image (weighted towards less shown)
quiz.get('/random', async (c) => {
  const env = c.env;

  try {
    // Get total count of approved images
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM quiz_images WHERE approved = 1'
    ).first<{ count: number }>();

    const totalImages = countResult?.count || 0;
    if (totalImages === 0) {
      return c.json({ error: 'Engar myndir í gagnagrunni' }, 404);
    }

    // Use random offset for true randomness
    const randomOffset = Math.floor(Math.random() * totalImages);

    const image = await env.DB.prepare(`
      SELECT id, image_key, icon_key, item, bin, reason, times_shown, times_correct
      FROM quiz_images
      WHERE approved = 1
      ORDER BY RANDOM()
      LIMIT 1
    `).first<QuizImage>();

    if (!image) {
      return c.json({ error: 'Engar myndir í gagnagrunni' }, 404);
    }

    // Update times_shown
    await env.DB.prepare(
      'UPDATE quiz_images SET times_shown = times_shown + 1 WHERE id = ?'
    ).bind(image.id).run();

    // Generate image URLs through our API (prefer icon if available)
    const imageUrl = `/api/quiz/image/${image.image_key}`;
    const iconUrl = image.icon_key ? `/api/quiz/image/${image.icon_key}` : null;

    return c.json({
      id: image.id,
      imageUrl,
      iconUrl, // Cartoon icon version (if available)
      imageKey: image.image_key,
      iconKey: image.icon_key,
      item: image.item, // Show item name in question
      options: Object.entries(BIN_INFO).map(([key, info]) => ({
        bin: key,
        name: info.name_is,
        icon: info.icon,
        color: info.color,
      })),
    });
  } catch (err) {
    console.error('Quiz random error:', err);
    return c.json({ error: 'Villa við að sækja spurningu' }, 500);
  }
});

// POST /api/quiz/answer - Submit an answer
quiz.post('/answer', async (c) => {
  const env = c.env;

  try {
    const { questionId, answer, userHash } = await c.req.json<{
      questionId: string;
      answer: string;
      userHash: string;
    }>();

    if (!questionId || !answer) {
      return c.json({ error: 'Vantar questionId eða answer' }, 400);
    }

    // Get the correct answer
    const image = await env.DB.prepare(
      'SELECT id, item, bin, reason FROM quiz_images WHERE id = ?'
    ).bind(questionId).first<QuizImage>();

    if (!image) {
      return c.json({ error: 'Spurning fannst ekki' }, 404);
    }

    const isCorrect = answer === image.bin;

    // Update stats
    if (isCorrect) {
      await env.DB.prepare(
        'UPDATE quiz_images SET times_correct = times_correct + 1 WHERE id = ?'
      ).bind(questionId).run();
    }

    return c.json({
      correct: isCorrect,
      correctAnswer: image.bin,
      correctBinInfo: BIN_INFO[image.bin as keyof typeof BIN_INFO],
      item: image.item,
      reason: image.reason,
      points: isCorrect ? 10 : 0,
    });
  } catch (err) {
    console.error('Quiz answer error:', err);
    return c.json({ error: 'Villa við að skrá svar' }, 500);
  }
});

// POST /api/quiz/score - Submit final score
quiz.post('/score', async (c) => {
  const env = c.env;

  try {
    const { userHash, score, totalQuestions, mode, timeSeconds } = await c.req.json<{
      userHash: string;
      score: number;
      totalQuestions: number;
      mode: string;
      timeSeconds?: number;
    }>();

    await env.DB.prepare(`
      INSERT INTO quiz_scores (user_hash, score, total_questions, mode, time_seconds)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userHash, score, totalQuestions, mode, timeSeconds || null).run();

    return c.json({ success: true });
  } catch (err) {
    console.error('Quiz score error:', err);
    return c.json({ error: 'Villa við að vista stig' }, 500);
  }
});

// GET /api/quiz/leaderboard - Get top scores
quiz.get('/leaderboard', async (c) => {
  const env = c.env;
  const mode = c.req.query('mode') || 'timed';

  try {
    const scores = await env.DB.prepare(`
      SELECT user_hash, score, total_questions, mode, time_seconds, created_at
      FROM quiz_scores
      WHERE mode = ?
      ORDER BY score DESC, time_seconds ASC
      LIMIT 20
    `).bind(mode).all<QuizScore>();

    return c.json({
      mode,
      scores: scores.results || [],
    });
  } catch (err) {
    console.error('Quiz leaderboard error:', err);
    return c.json({ error: 'Villa við að sækja stigatöflu' }, 500);
  }
});

// GET /api/quiz/stats - Get quiz statistics
quiz.get('/stats', async (c) => {
  const env = c.env;

  try {
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_images,
        SUM(times_shown) as total_played,
        SUM(times_correct) as total_correct
      FROM quiz_images WHERE approved = 1
    `).first<{ total_images: number; total_played: number; total_correct: number }>();

    const accuracy = stats?.total_played
      ? Math.round((stats.total_correct / stats.total_played) * 100)
      : 0;

    return c.json({
      totalImages: stats?.total_images || 0,
      totalPlayed: stats?.total_played || 0,
      totalCorrect: stats?.total_correct || 0,
      accuracy,
    });
  } catch (err) {
    console.error('Quiz stats error:', err);
    return c.json({ error: 'Villa við að sækja tölfræði' }, 500);
  }
});

// DELETE /api/quiz/scores - Delete all quiz scores (with password)
quiz.delete('/scores', async (c) => {
  const env = c.env;

  try {
    const { password } = await c.req.json<{ password: string }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    await env.DB.prepare('DELETE FROM quiz_scores').run();

    return c.json({ success: true, message: 'Öll stig eytt' });
  } catch (err) {
    console.error('Quiz delete scores error:', err);
    return c.json({ error: 'Villa við að eyða stigum' }, 500);
  }
});

// DELETE /api/quiz/images - Delete all quiz images (with password)
quiz.delete('/images', async (c) => {
  const env = c.env;

  try {
    const { password } = await c.req.json<{ password: string }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    // Get all image keys to delete from R2
    const images = await env.DB.prepare('SELECT image_key FROM quiz_images').all<{ image_key: string }>();

    // Delete from R2
    for (const img of images.results || []) {
      try {
        await env.IMAGES.delete(img.image_key);
      } catch (e) {
        console.error('Failed to delete R2 image:', img.image_key, e);
      }
    }

    // Delete from database
    await env.DB.prepare('DELETE FROM quiz_images').run();

    return c.json({
      success: true,
      message: `${images.results?.length || 0} myndir eyddar`
    });
  } catch (err) {
    console.error('Quiz delete images error:', err);
    return c.json({ error: 'Villa við að eyða myndum' }, 500);
  }
});

// GET /api/quiz/duplicates - Find duplicate images by item name
quiz.get('/duplicates', async (c) => {
  const env = c.env;

  try {
    // Find items with multiple images
    const duplicates = await env.DB.prepare(`
      SELECT item, bin, COUNT(*) as count
      FROM quiz_images
      GROUP BY item, bin
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `).all<{ item: string; bin: string; count: number }>();

    return c.json({
      success: true,
      duplicates: duplicates.results || [],
      total: duplicates.results?.length || 0
    });
  } catch (err) {
    console.error('Quiz duplicates error:', err);
    return c.json({ error: 'Villa við að finna tvítekningar' }, 500);
  }
});

// DELETE /api/quiz/duplicates - Remove duplicate images, keeping one of each
quiz.delete('/duplicates', async (c) => {
  const env = c.env;

  try {
    const { password } = await c.req.json<{ password: string }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    // Find duplicates - keep the one with highest times_correct ratio
    const toDelete = await env.DB.prepare(`
      SELECT id, image_key FROM quiz_images
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY item, bin
            ORDER BY
              CASE WHEN times_shown > 0 THEN CAST(times_correct AS REAL) / times_shown ELSE 0 END DESC,
              times_shown DESC
          ) as rn
          FROM quiz_images
        ) WHERE rn = 1
      )
    `).all<{ id: string; image_key: string }>();

    let deletedCount = 0;

    // Delete from R2 and DB
    for (const img of toDelete.results || []) {
      try {
        await env.IMAGES.delete(img.image_key);
        await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(img.id).run();
        deletedCount++;
      } catch (e) {
        console.error('Failed to delete duplicate:', img.id, e);
      }
    }

    return c.json({
      success: true,
      message: `${deletedCount} tvítekningar eyddar`
    });
  } catch (err) {
    console.error('Quiz delete duplicates error:', err);
    return c.json({ error: 'Villa við að eyða tvítekningum' }, 500);
  }
});

// GET /api/quiz/orphans - Find orphan images (in DB but not in R2)
quiz.get('/orphans', async (c) => {
  const env = c.env;

  try {
    // Get all images from database
    const images = await env.DB.prepare(
      'SELECT id, image_key, item, bin FROM quiz_images'
    ).all<{ id: string; image_key: string; item: string; bin: string }>();

    const orphans: Array<{ id: string; image_key: string; item: string; bin: string }> = [];

    // Check each image exists in R2
    for (const img of images.results || []) {
      try {
        const object = await env.IMAGES.head(img.image_key);
        if (!object) {
          orphans.push(img);
        }
      } catch {
        orphans.push(img);
      }
    }

    return c.json({
      success: true,
      orphans,
      total: orphans.length,
      totalImages: images.results?.length || 0,
    });
  } catch (err) {
    console.error('Quiz orphans error:', err);
    return c.json({ error: 'Villa við að finna munaðarlausar myndir' }, 500);
  }
});

// DELETE /api/quiz/orphans - Remove orphan images from database
quiz.delete('/orphans', async (c) => {
  const env = c.env;

  try {
    const { password } = await c.req.json<{ password: string }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    // Get all images from database
    const images = await env.DB.prepare(
      'SELECT id, image_key FROM quiz_images'
    ).all<{ id: string; image_key: string }>();

    let deletedCount = 0;

    // Check each image exists in R2, delete from DB if not
    for (const img of images.results || []) {
      try {
        const object = await env.IMAGES.head(img.image_key);
        if (!object) {
          await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(img.id).run();
          deletedCount++;
        }
      } catch {
        await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(img.id).run();
        deletedCount++;
      }
    }

    return c.json({
      success: true,
      message: `${deletedCount} munaðarlausar myndir eyddar`,
      deletedCount,
    });
  } catch (err) {
    console.error('Quiz delete orphans error:', err);
    return c.json({ error: 'Villa við að eyða munaðarlausum myndum' }, 500);
  }
});

// GET /api/quiz/missing-icons - Get images without icons
quiz.get('/missing-icons', async (c) => {
  const env = c.env;

  try {
    const images = await env.DB.prepare(`
      SELECT id, image_key, item, bin
      FROM quiz_images
      WHERE icon_key IS NULL AND approved = 1
      ORDER BY times_shown DESC
      LIMIT 100
    `).all<{ id: string; image_key: string; item: string; bin: string }>();

    return c.json({
      success: true,
      images: images.results || [],
      total: images.results?.length || 0,
    });
  } catch (err) {
    console.error('Quiz missing icons error:', err);
    return c.json({ error: 'Villa við að sækja myndir án íkona' }, 500);
  }
});

// POST /api/quiz/generate-icon/:id - Generate icon for a specific quiz image
quiz.post('/generate-icon/:id', async (c) => {
  const env = c.env;
  const imageId = c.req.param('id');

  try {
    const { password } = await c.req.json<{ password: string }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    // Get the image from database
    const image = await env.DB.prepare(
      'SELECT id, image_key, icon_key, item, bin FROM quiz_images WHERE id = ?'
    ).bind(imageId).first<QuizImage>();

    if (!image) {
      return c.json({ error: 'Mynd fannst ekki' }, 404);
    }

    if (image.icon_key) {
      return c.json({ success: true, message: 'Ikon þegar til', iconKey: image.icon_key });
    }

    // Get the original image from R2
    const originalImage = await env.IMAGES.get(image.image_key);
    if (!originalImage) {
      return c.json({ error: 'Upprunalega mynd fannst ekki í R2' }, 404);
    }

    // Convert R2 object to base64
    const imageArrayBuffer = await originalImage.arrayBuffer();
    const imageBase64 = arrayBufferToBase64(imageArrayBuffer);

    // Generate icon
    if (!env.GEMINI_API_KEY) {
      return c.json({ error: 'Gemini API lykill vantar' }, 500);
    }

    console.log(`[Quiz Icon] Generating icon for: ${image.item} (${imageId})`);
    const iconResult = await generateIcon(imageBase64, env.GEMINI_API_KEY, image.item);

    if (!iconResult.success || !iconResult.iconImage) {
      return c.json({
        success: false,
        error: iconResult.error || 'Gat ekki búið til ikon',
      });
    }

    // Save icon to R2
    const iconKey = image.image_key
      .replace('quiz/', 'quiz/icons/')
      .replace(/\.(jpg|jpeg|png|webp)$/i, '.png');
    // Strip data URL prefix if present
    const rawBase64 = iconResult.iconImage.replace(/^data:image\/\w+;base64,/, '');
    const iconData = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));

    await env.IMAGES.put(iconKey, iconData, {
      httpMetadata: { contentType: 'image/png' },
      customMetadata: { item: image.item, bin: image.bin, sourceImage: image.image_key },
    });

    // Update database with icon key
    await env.DB.prepare(
      'UPDATE quiz_images SET icon_key = ? WHERE id = ?'
    ).bind(iconKey, imageId).run();

    console.log(`[Quiz Icon] Icon saved: ${iconKey}`);

    return c.json({
      success: true,
      iconKey,
      iconUrl: `/api/quiz/image/${iconKey}`,
    });
  } catch (err) {
    console.error('Quiz generate icon error:', err);
    return c.json({ error: 'Villa við að búa til ikon' }, 500);
  }
});

// POST /api/quiz/generate-missing-icons - Batch generate icons for images without them
quiz.post('/generate-missing-icons', async (c) => {
  const env = c.env;

  try {
    const { password, limit = 5 } = await c.req.json<{ password: string; limit?: number }>();
    const forbidden = requireAdmin(c, password);
    if (forbidden) return forbidden;

    if (!env.GEMINI_API_KEY) {
      return c.json({ error: 'Gemini API lykill vantar' }, 500);
    }

    // Get images without icons
    const images = await env.DB.prepare(`
      SELECT id, image_key, item, bin
      FROM quiz_images
      WHERE icon_key IS NULL AND approved = 1
      ORDER BY times_shown DESC
      LIMIT ?
    `).bind(Math.min(limit, 10)).all<{ id: string; image_key: string; item: string; bin: string }>();

    const results: Array<{ id: string; item: string; success: boolean; error?: string; iconKey?: string }> = [];

    for (const image of images.results || []) {
      try {
        // Get original image from R2
        const originalImage = await env.IMAGES.get(image.image_key);
        if (!originalImage) {
          results.push({ id: image.id, item: image.item, success: false, error: 'Mynd fannst ekki í R2' });
          continue;
        }

        // Convert to base64
        const imageArrayBuffer = await originalImage.arrayBuffer();
        const imageBase64 = arrayBufferToBase64(imageArrayBuffer);

        // Generate icon
        console.log(`[Quiz Icon Batch] Generating icon for: ${image.item} (${image.id})`);
        const iconResult = await generateIcon(imageBase64, env.GEMINI_API_KEY, image.item);

        if (!iconResult.success || !iconResult.iconImage) {
          results.push({ id: image.id, item: image.item, success: false, error: iconResult.error });
          continue;
        }

        // Save icon to R2
        const iconKey = image.image_key
          .replace('quiz/', 'quiz/icons/')
          .replace(/\.(jpg|jpeg|png|webp)$/i, '.png');
        // Strip data URL prefix if present
        const rawBase64 = iconResult.iconImage.replace(/^data:image\/\w+;base64,/, '');
        const iconData = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));

        await env.IMAGES.put(iconKey, iconData, {
          httpMetadata: { contentType: 'image/png' },
          customMetadata: { item: image.item, bin: image.bin, sourceImage: image.image_key },
        });

        // Update database
        await env.DB.prepare(
          'UPDATE quiz_images SET icon_key = ? WHERE id = ?'
        ).bind(iconKey, image.id).run();

        results.push({ id: image.id, item: image.item, success: true, iconKey });
        console.log(`[Quiz Icon Batch] Icon saved: ${iconKey}`);

        // Small delay between generations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[Quiz Icon Batch] Error for ${image.id}:`, err);
        results.push({ id: image.id, item: image.item, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return c.json({
      success: true,
      message: `${successCount}/${results.length} íkon búin til`,
      results,
    });
  } catch (err) {
    console.error('Quiz generate missing icons error:', err);
    return c.json({ error: 'Villa við að búa til íkon' }, 500);
  }
});

export default quiz;
