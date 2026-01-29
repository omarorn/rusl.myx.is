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

function extractJokeFromCustomMetadata(customMetadata: Record<string, string> | undefined): {
  joke_key?: string;
  joke_text?: string;
} {
  if (!customMetadata) return {};

  const directKey =
    customMetadata.joke_key ||
    customMetadata.jokeKey ||
    customMetadata.joke_background ||
    customMetadata.jokeBackground ||
    customMetadata.joke_image ||
    customMetadata.jokeImage;

  const directText =
    customMetadata.joke ||
    customMetadata.dad_joke ||
    customMetadata.dadJoke ||
    customMetadata.joke_text ||
    customMetadata.jokeText;

  // Fall back: scan all metadata values for anything that looks like an R2 key
  // containing jokes/....png
  let scannedKey: string | undefined;
  for (const value of Object.values(customMetadata)) {
    if (typeof value !== 'string' || !value) continue;
    if (/^(quiz\/)?jokes\/.+\.(png|jpg|jpeg|webp)$/i.test(value.trim())) {
      scannedKey = value.trim();
      break;
    }

    // Sometimes metadata may be JSON-encoded
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (parsed && typeof parsed === 'object') {
          const jsonString = JSON.stringify(parsed);
          const match = jsonString.match(/(quiz\/)?jokes\/[A-Za-z0-9_\-%.\p{L}]+\.(png|jpg|jpeg|webp)/iu);
          if (match?.[0]) {
            scannedKey = match[0];
            break;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const joke_key = (directKey || scannedKey) ?? undefined;
  const joke_text = directText ?? undefined;

  return { joke_key, joke_text };
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

    // Backward compatibility:
    // - Old clients expect { fact_is, category, image_key }
    // - New clients expect quiz-backed fields like { item, bin, reason, icon_key }
    const toResponse = (f: QuizFactWithStatus) => ({
      ...f,
      fact_is: f.reason || f.item,
      category: f.bin,
      image_key: f.image_key,
    });

    return c.json({
      success: true,
      facts: factsWithStatus.map(toResponse),
      seen: seen.map(toResponse),
      unseen: unseen.map(toResponse),
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

    const history = (result.results || []).map((row: Record<string, unknown>) => ({
      ...row,
      // Legacy aliases
      fact_is: row.reason ?? row.item,
      category: row.bin,
      fun_fact_id: row.quiz_image_id,
    }));

    return c.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (err) {
    console.error('FunFacts history error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// POST /api/funfacts/mark-seen - Mark a quiz-backed fact as seen
funfacts.post('/mark-seen', async (c) => {
  const env = c.env;

  let body: { userHash: string; quizImageId?: string; funFactId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Ógild fyrirspurn' }, 400);
  }

  const quizImageId = body.quizImageId || body.funFactId;
  if (!body.userHash || !quizImageId) {
    return c.json({ error: 'userHash og quizImageId vantar' }, 400);
  }

  try {
    // Check if already marked as seen
    const existing = await env.DB.prepare(
      'SELECT id FROM user_quiz_facts WHERE user_hash = ? AND quiz_image_id = ?'
    ).bind(body.userHash, quizImageId).first();

    if (existing) {
      // Already seen - update timestamp
      await env.DB.prepare(
        'UPDATE user_quiz_facts SET seen_at = unixepoch() WHERE user_hash = ? AND quiz_image_id = ?'
      ).bind(body.userHash, quizImageId).run();
    } else {
      // Insert new record
      await env.DB.prepare(
        'INSERT INTO user_quiz_facts (user_hash, quiz_image_id, seen_at) VALUES (?, ?, unixepoch())'
      ).bind(body.userHash, quizImageId).run();
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
        fact: {
          ...unseenResult,
          // Legacy aliases
          fact_is: unseenResult.reason || unseenResult.item,
          category: unseenResult.bin,
          image_key: unseenResult.image_key,
        },
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
        fact: {
          ...randomResult,
          // Legacy aliases
          fact_is: randomResult.reason || randomResult.item,
          category: randomResult.bin,
          image_key: randomResult.image_key,
        },
        seen: true,
      });
    }

    return c.json({ error: 'Enginn fróðleikur fundinn' }, 404);
  } catch (err) {
    console.error('Random fun fact error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

// GET /api/funfacts/detail/:id - Enriched detail for a single fact (includes optional joke metadata)
funfacts.get('/detail/:id', async (c) => {
  const env = c.env;
  const id = c.req.param('id');

  if (!id) {
    return c.json({ error: 'id vantar' }, 400);
  }

  try {
    const fact = await env.DB.prepare(`
      SELECT id, item, bin, reason, confidence, image_key, icon_key, created_at
      FROM quiz_images
      WHERE id = ? AND approved = 1
      LIMIT 1
    `).bind(id).first<QuizFact>();

    if (!fact) {
      return c.json({ error: 'Fróðleikur fannst ekki' }, 404);
    }

    // Best-effort: pull custom metadata from the *original* image object.
    // We use head() to avoid downloading the image bytes.
    const candidateImageKeys: string[] = [];
    const add = (k: string | null | undefined) => {
      if (!k) return;
      if (!candidateImageKeys.includes(k)) candidateImageKeys.push(k);
    };
    add(fact.image_key);
    try {
      const decoded = decodeURIComponent(fact.image_key);
      if (decoded && decoded !== fact.image_key) add(decoded);
    } catch {
      // ignore
    }
    if (fact.image_key.startsWith('quiz/')) add(fact.image_key.slice('quiz/'.length));

    let head: R2Object | null = null;
    for (const key of candidateImageKeys) {
      // eslint-disable-next-line no-await-in-loop
      const candidate = await env.IMAGES.head(key);
      if (candidate) {
        head = candidate;
        break;
      }
    }

    const { joke_key, joke_text } = extractJokeFromCustomMetadata(head?.customMetadata);

    return c.json({
      success: true,
      fact: {
        ...fact,
        joke_key: joke_key ?? null,
        joke_text: joke_text ?? null,
        // Legacy aliases
        fact_is: fact.reason || fact.item,
        category: fact.bin,
        image_key: fact.image_key,
      },
    });
  } catch (err) {
    console.error('FunFacts detail error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

export default funfacts;
