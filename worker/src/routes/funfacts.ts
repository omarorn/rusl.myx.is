import { Hono } from 'hono';
import type { Env } from '../types';

const funfacts = new Hono<{ Bindings: Env }>();

interface QuizFact {
  id: string;
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  image_key: string;
  icon_key: string | null;
  created_at: number;
}

interface QuizFactWithStatus extends QuizFact {
  seen: boolean;
  seen_at?: number;
}

// GET /api/funfacts - Get all quiz-backed "fun facts" with user's viewing status
funfacts.get('/', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    // Get all approved quiz images (these are created from real scans)
    const factsResult = await env.DB.prepare(`
      SELECT id, item, bin, reason, confidence, image_key, icon_key, created_at
      FROM quiz_images
      WHERE approved = 1
      ORDER BY created_at DESC
    `).all<QuizFact>();

    const facts = factsResult.results || [];

    // Get user's viewing history (quiz-backed)
    const historyResult = await env.DB.prepare(
      'SELECT quiz_image_id, seen_at FROM user_quiz_facts WHERE user_hash = ? ORDER BY seen_at DESC'
    ).bind(userHash).all<{ quiz_image_id: string; seen_at: number }>();

    const history = historyResult.results || [];
    const seenMap = new Map(history.map(h => [h.quiz_image_id, h.seen_at]));

    // Combine with viewing status
    const factsWithStatus: QuizFactWithStatus[] = facts.map(fact => ({
      ...fact,
      seen: seenMap.has(fact.id),
      seen_at: seenMap.get(fact.id),
    }));

    // Separate seen and unseen
    const seen = factsWithStatus.filter(f => f.seen).sort((a, b) => (b.seen_at || 0) - (a.seen_at || 0));
    const unseen = factsWithStatus.filter(f => !f.seen);

    return c.json({
      success: true,
      facts: factsWithStatus,
      seen,
      unseen,
      total: factsWithStatus.length,
      seenCount: seen.length,
      unseenCount: unseen.length,
    });
  } catch (err) {
    console.error('FunFacts error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// GET /api/funfacts/history - Get user's viewing history (quiz-backed)
funfacts.get('/history', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT
        uqf.id,
        uqf.seen_at,
        qi.id as quiz_image_id,
        qi.item,
        qi.bin,
        qi.reason,
        qi.confidence,
        qi.image_key,
        qi.icon_key,
        qi.created_at
      FROM user_quiz_facts uqf
      JOIN quiz_images qi ON uqf.quiz_image_id = qi.id
      WHERE uqf.user_hash = ? AND qi.approved = 1
      ORDER BY uqf.seen_at DESC
      LIMIT 200
    `).bind(userHash).all();

    return c.json({
      success: true,
      history: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (err) {
    console.error('FunFacts history error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// POST /api/funfacts/mark-seen - Mark a quiz-backed fact as seen
funfacts.post('/mark-seen', async (c) => {
  const env = c.env;

  let body: { userHash: string; quizImageId: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Ógild fyrirspurn' }, 400);
  }

  if (!body.userHash || !body.quizImageId) {
    return c.json({ error: 'userHash og quizImageId vantar' }, 400);
  }

  try {
    // Check if already marked as seen
    const existing = await env.DB.prepare(
      'SELECT id FROM user_quiz_facts WHERE user_hash = ? AND quiz_image_id = ?'
    ).bind(body.userHash, body.quizImageId).first();

    if (existing) {
      // Already seen - update timestamp
      await env.DB.prepare(
        'UPDATE user_quiz_facts SET seen_at = unixepoch() WHERE user_hash = ? AND quiz_image_id = ?'
      ).bind(body.userHash, body.quizImageId).run();
    } else {
      // Insert new record
      await env.DB.prepare(
        'INSERT INTO user_quiz_facts (user_hash, quiz_image_id, seen_at) VALUES (?, ?, unixepoch())'
      ).bind(body.userHash, body.quizImageId).run();
    }

    return c.json({ success: true });
  } catch (err) {
    console.error('Mark seen error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// GET /api/funfacts/random - Get a random unseen quiz-backed fact (or any if all seen)
funfacts.get('/random', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    // Try to get an unseen fun fact
    const unseenResult = await env.DB.prepare(`
      SELECT qi.id, qi.item, qi.bin, qi.reason, qi.confidence, qi.image_key, qi.icon_key, qi.created_at
      FROM quiz_images qi
      LEFT JOIN user_quiz_facts uqf ON qi.id = uqf.quiz_image_id AND uqf.user_hash = ?
      WHERE uqf.id IS NULL AND qi.approved = 1
      ORDER BY RANDOM()
      LIMIT 1
    `).bind(userHash).first<QuizFact>();

    if (unseenResult) {
      return c.json({
        success: true,
        fact: unseenResult,
        seen: false,
      });
    }

    // All facts have been seen - return any random fact
    const randomResult = await env.DB.prepare(`
      SELECT id, item, bin, reason, confidence, image_key, icon_key, created_at
      FROM quiz_images
      WHERE approved = 1
      ORDER BY RANDOM()
      LIMIT 1
    `).first<QuizFact>();

    if (randomResult) {
      return c.json({
        success: true,
        fact: randomResult,
        seen: true,
      });
    }

    return c.json({ error: 'Enginn fróðleikur fundinn' }, 404);
  } catch (err) {
    console.error('Random fun fact error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

export default funfacts;
