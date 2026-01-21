import { Hono } from 'hono';
import type { Env } from '../types';
import { BIN_INFO } from '../services/iceland-rules';

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
  const imageKey = c.req.path.replace('/api/quiz/image/', '');

  try {
    const object = await env.IMAGES.get(imageKey);
    if (!object) {
      return c.json({ error: 'Mynd fannst ekki' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Quiz image error:', err);
    return c.json({ error: 'Villa við að sækja mynd' }, 500);
  }
});

// GET /api/quiz/random - Get next quiz image (newest first, ordered by least shown)
quiz.get('/random', async (c) => {
  const env = c.env;
  const questionIndex = parseInt(c.req.query('index') || '0', 10);

  try {
    // Get total count of approved images
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM quiz_images WHERE approved = 1'
    ).first<{ count: number }>();

    const totalImages = countResult?.count || 0;
    if (totalImages === 0) {
      return c.json({ error: 'Engar myndir í gagnagrunni' }, 404);
    }

    // Use index to get images in order: newest first, then by least shown
    const offset = questionIndex % totalImages; // Wrap around if index exceeds total

    const image = await env.DB.prepare(`
      SELECT id, image_key, icon_key, item, bin, reason, times_shown, times_correct
      FROM quiz_images
      WHERE approved = 1
      ORDER BY times_shown ASC, created_at DESC
      LIMIT 1 OFFSET ?
    `).bind(offset).first<QuizImage>();

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

    if (password !== 'bobba') {
      return c.json({ error: 'Rangt lykilorð' }, 403);
    }

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

    if (password !== 'bobba') {
      return c.json({ error: 'Rangt lykilorð' }, 403);
    }

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

    if (password !== 'bobba') {
      return c.json({ error: 'Rangt lykilorð' }, 403);
    }

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

    if (password !== 'bobba') {
      return c.json({ error: 'Rangt lykilorð' }, 403);
    }

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

export default quiz;
