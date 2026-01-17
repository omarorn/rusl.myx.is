import { Hono } from 'hono';
import type { Env } from '../types';
import { BIN_INFO } from '../services/iceland-rules';

const quiz = new Hono<{ Bindings: Env }>();

interface QuizImage {
  id: string;
  image_key: string;
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

// GET /api/quiz/random - Get a random quiz image
quiz.get('/random', async (c) => {
  const env = c.env;

  try {
    // Get a random approved quiz image
    const image = await env.DB.prepare(`
      SELECT id, image_key, item, bin, reason, times_shown, times_correct
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

    // Generate image URL through our API
    const imageUrl = `/api/quiz/image/${image.image_key}`;

    return c.json({
      id: image.id,
      imageUrl,
      imageKey: image.image_key,
      // Don't reveal the answer yet!
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

export default quiz;
