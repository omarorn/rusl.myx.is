import { Hono } from 'hono';
import type { Env } from '../types';
import { runPostProcessingReview } from '../services/review';

const app = new Hono<{ Bindings: Env }>();

// Get review stats
app.get('/', async (c) => {
  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_scans,
      SUM(CASE WHEN reviewed_at IS NOT NULL THEN 1 ELSE 0 END) as reviewed_count,
      SUM(CASE WHEN reviewed_at IS NOT NULL AND original_bin != bin THEN 1 ELSE 0 END) as changed_count
    FROM scans
    WHERE created_at > unixepoch() - 86400 * 7
  `).first();

  const recentLogs = await c.env.DB.prepare(`
    SELECT * FROM review_log
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return c.json({
    last7Days: stats,
    recentRuns: recentLogs.results || [],
  });
});

// Get recent changes
app.get('/changes', async (c) => {
  const changes = await c.env.DB.prepare(`
    SELECT
      id,
      original_item,
      original_bin,
      item,
      bin,
      reviewed_by,
      reviewed_at,
      review_reason
    FROM scans
    WHERE reviewed_at IS NOT NULL
      AND original_bin IS NOT NULL
      AND original_bin != bin
    ORDER BY reviewed_at DESC
    LIMIT 50
  `).all();

  return c.json({ changes: changes.results || [] });
});

// Manually trigger review (admin only - could add auth later)
app.post('/trigger', async (c) => {
  console.log('[Review] Manual trigger requested');

  // Debug: check what the query returns
  const unreviewed = await c.env.DB.prepare(`
    SELECT id, image_key, item, bin, confidence
    FROM scans
    WHERE reviewed_at IS NULL
      AND image_key IS NOT NULL
      AND confidence < 0.9
      AND created_at > unixepoch() - 86400
    ORDER BY confidence ASC
    LIMIT 3
  `).all();

  const debugInfo = {
    queryResults: unreviewed.results?.length || 0,
    firstItem: unreviewed.results?.[0] || null,
  };

  // Test getting first image
  if (unreviewed.results && unreviewed.results.length > 0) {
    const firstImageKey = unreviewed.results[0].image_key as string;
    const imageObj = await c.env.IMAGES.get(firstImageKey);
    (debugInfo as Record<string, unknown>).imageFound = !!imageObj;
    if (imageObj) {
      const buffer = await imageObj.arrayBuffer();
      (debugInfo as Record<string, unknown>).imageSize = buffer.byteLength;
    }
  }

  const stats = await runPostProcessingReview(c.env);

  return c.json({
    success: true,
    stats,
    debug: debugInfo,
  });
});

export default app;
