import { Hono } from 'hono';
import type { Env, UserStats } from '../types';

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

export default stats;
