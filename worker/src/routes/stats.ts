import { Hono } from 'hono';
import type { Env, UserStats } from '../types';
import { generateJokeFromScans, type JokeResponse } from '../services/joke-generator';

const stats = new Hono<{ Bindings: Env }>();

// GET /api/stats?userHash=xxx
stats.get('/', async (c) => {
  const userHash = c.req.query('userHash');
  
  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }
  
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE user_hash = ?'
  ).bind(userHash).first<UserStats>();
  
  if (!user) {
    return c.json({
      user_hash: userHash,
      total_scans: 0,
      total_points: 0,
      current_streak: 0,
      best_streak: 0,
      last_scan_date: null,
    });
  }
  
  return c.json(user);
});

// GET /api/stats/leaderboard
stats.get('/leaderboard', async (c) => {
  const sveitarfelag = c.req.query('sveitarfelag') || 'reykjavik';
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);
  
  const result = await c.env.DB.prepare(`
    SELECT user_hash, total_scans, total_points, best_streak
    FROM users
    ORDER BY total_points DESC
    LIMIT ?
  `).bind(limit).all();
  
  return c.json({
    sveitarfelag,
    leaderboard: result.results || [],
  });
});

// GET /api/stats/global
stats.get('/global', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_scans,
      COUNT(DISTINCT user_hash) as total_users,
      SUM(CASE WHEN bin = 'paper' THEN 1 ELSE 0 END) as paper_count,
      SUM(CASE WHEN bin = 'plastic' THEN 1 ELSE 0 END) as plastic_count,
      SUM(CASE WHEN bin = 'food' THEN 1 ELSE 0 END) as food_count,
      SUM(CASE WHEN bin = 'mixed' THEN 1 ELSE 0 END) as mixed_count
    FROM scans
  `).first();

  return c.json(result || {});
});

// GET /api/stats/recent - 10 síðustu áhugaverðu dæmin (ekki mixed eða ógreint)
stats.get('/recent', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '10', 10), 50);

  const result = await c.env.DB.prepare(`
    SELECT
      id,
      item,
      bin,
      confidence,
      image_key,
      created_at
    FROM scans
    WHERE bin != 'mixed'
      AND item != 'Óþekkt hlutur'
      AND item != 'Óþekkt'
      AND confidence > 0.5
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();

  // Format the results with readable timestamps
  const examples = (result.results || []).map((scan: Record<string, unknown>) => ({
    id: scan.id,
    item: scan.item,
    bin: scan.bin,
    confidence: scan.confidence,
    imageKey: scan.image_key,
    // Convert Unix timestamp to ISO string
    scannedAt: scan.created_at ? new Date((scan.created_at as number) * 1000).toISOString() : null,
  }));

  return c.json({
    count: examples.length,
    examples,
  });
});

// GET /api/stats/joke - AI-generated joke of the day based on recent scans
stats.get('/joke', async (c) => {
  const CACHE_KEY = 'joke_of_the_day';
  const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

  // Try to get cached joke
  const cached = await c.env.CACHE.get(CACHE_KEY);
  if (cached) {
    try {
      const jokeData = JSON.parse(cached) as JokeResponse;
      return c.json(jokeData);
    } catch {
      // Invalid cache, regenerate
    }
  }

  // Get recent scans for joke generation
  const result = await c.env.DB.prepare(`
    SELECT item, bin
    FROM scans
    WHERE bin != 'mixed'
      AND item != 'Óþekkt hlutur'
      AND item != 'Óþekkt'
      AND confidence > 0.5
    ORDER BY created_at DESC
    LIMIT 20
  `).all();

  const recentScans = (result.results || []).map((scan: Record<string, unknown>) => ({
    item: scan.item as string,
    bin: scan.bin as string,
  }));

  // Generate new joke
  const jokeResponse = await generateJokeFromScans(recentScans, c.env.GEMINI_API_KEY);

  if (!jokeResponse) {
    // Return fallback joke if generation fails
    const fallback: JokeResponse = {
      joke: 'Af hverju fór plastflaskan í ræktina? Til að verða BUFF-ur fyrir grænu tunnuna!',
      basedOn: [],
      generatedAt: new Date().toISOString(),
    };
    return c.json(fallback);
  }

  // Cache the joke
  await c.env.CACHE.put(CACHE_KEY, JSON.stringify(jokeResponse), { expirationTtl: CACHE_TTL });

  return c.json(jokeResponse);
});

export default stats;
