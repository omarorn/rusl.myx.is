import { Hono } from 'hono';
import type { Env } from '../types';

const funfacts = new Hono<{ Bindings: Env }>();

interface FunFact {
  id: number;
  fact_is: string;
  category: string;
  image_key: string | null;
}

interface UserFunFact {
  id: string;
  user_hash: string;
  fun_fact_id: number;
  seen_at: number;
}

interface FunFactWithStatus extends FunFact {
  seen: boolean;
  seen_at?: number;
}

// GET /api/funfacts - Get all fun facts with user's viewing status
funfacts.get('/', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    // Get all fun facts
    const factsResult = await env.DB.prepare(
      'SELECT id, fact_is, category, image_key FROM fun_facts ORDER BY id'
    ).all<FunFact>();

    if (!factsResult.results) {
      return c.json({ error: 'Gat ekki sótt fróðleik' }, 500);
    }

    // Get user's viewing history
    const historyResult = await env.DB.prepare(
      'SELECT fun_fact_id, seen_at FROM user_fun_facts WHERE user_hash = ? ORDER BY seen_at DESC'
    ).bind(userHash).all<{ fun_fact_id: number; seen_at: number }>();

    const history = historyResult.results || [];
    const seenMap = new Map(history.map(h => [h.fun_fact_id, h.seen_at]));

    // Combine facts with viewing status
    const factsWithStatus: FunFactWithStatus[] = factsResult.results.map(fact => ({
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

// GET /api/funfacts/history - Get user's viewing history
funfacts.get('/history', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    // Get user's viewing history with full fact details
    const result = await env.DB.prepare(`
      SELECT
        uf.id,
        uf.seen_at,
        ff.id as fun_fact_id,
        ff.fact_is,
        ff.category,
        ff.image_key
      FROM user_fun_facts uf
      JOIN fun_facts ff ON uf.fun_fact_id = ff.id
      WHERE uf.user_hash = ?
      ORDER BY uf.seen_at DESC
      LIMIT 100
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

// POST /api/funfacts/mark-seen - Mark a fun fact as seen
funfacts.post('/mark-seen', async (c) => {
  const env = c.env;

  let body: { userHash: string; funFactId: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Ógild fyrirspurn' }, 400);
  }

  if (!body.userHash || !body.funFactId) {
    return c.json({ error: 'userHash og funFactId vantar' }, 400);
  }

  try {
    // Check if already marked as seen
    const existing = await env.DB.prepare(
      'SELECT id FROM user_fun_facts WHERE user_hash = ? AND fun_fact_id = ?'
    ).bind(body.userHash, body.funFactId).first();

    if (existing) {
      // Already seen - update timestamp
      await env.DB.prepare(
        'UPDATE user_fun_facts SET seen_at = unixepoch() WHERE user_hash = ? AND fun_fact_id = ?'
      ).bind(body.userHash, body.funFactId).run();
    } else {
      // Insert new record
      await env.DB.prepare(
        'INSERT INTO user_fun_facts (user_hash, fun_fact_id, seen_at) VALUES (?, ?, unixepoch())'
      ).bind(body.userHash, body.funFactId).run();
    }

    return c.json({ success: true });
  } catch (err) {
    console.error('Mark seen error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// GET /api/funfacts/random - Get a random unseen fun fact (or any if all seen)
funfacts.get('/random', async (c) => {
  const env = c.env;
  const userHash = c.req.query('userHash');

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  try {
    // Try to get an unseen fun fact
    const unseenResult = await env.DB.prepare(`
      SELECT ff.id, ff.fact_is, ff.category, ff.image_key
      FROM fun_facts ff
      LEFT JOIN user_fun_facts uf ON ff.id = uf.fun_fact_id AND uf.user_hash = ?
      WHERE uf.id IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `).bind(userHash).first<FunFact>();

    if (unseenResult) {
      return c.json({
        success: true,
        fact: unseenResult,
        seen: false,
      });
    }

    // All facts have been seen - return any random fact
    const randomResult = await env.DB.prepare(
      'SELECT id, fact_is, category, image_key FROM fun_facts ORDER BY RANDOM() LIMIT 1'
    ).first<FunFact>();

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
