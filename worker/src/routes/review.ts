import { Hono } from 'hono';
import type { Env } from '../types';
import { runPostProcessingReview } from '../services/review';
import { requireAdmin } from '../services/admin-auth';

const app = new Hono<{ Bindings: Env }>();

// User flagging ("Rangt")
app.post('/flag', async (c) => {
  let body: {
    userHash?: string;
    item?: string;
    bin?: string;
    reason?: string;
    confidence?: number;
    imageKey?: string | null;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Ógild fyrirspurn' }, 400);
  }

  if (!body?.userHash || !body?.item || !body?.bin) {
    return c.json({ error: 'userHash, item og bin vantar' }, 400);
  }

  try {
    // Keep this migration-less and safe to run repeatedly.
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS review_flags (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        created_at INTEGER DEFAULT (unixepoch()),
        user_hash TEXT NOT NULL,
        image_key TEXT,
        item TEXT NOT NULL,
        bin TEXT NOT NULL,
        reason TEXT,
        confidence REAL,
        status TEXT DEFAULT 'new'
      );
    `).run();

    await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_review_flags_created_at ON review_flags(created_at);').run();
    await c.env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_review_flags_status ON review_flags(status);').run();

    await c.env.DB.prepare(`
      INSERT INTO review_flags (user_hash, image_key, item, bin, reason, confidence)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      body.userHash,
      body.imageKey || null,
      body.item,
      body.bin,
      body.reason || null,
      typeof body.confidence === 'number' ? body.confidence : null
    ).run();

    return c.json({ success: true });
  } catch (err) {
    console.error('Review flag error:', err);
    return c.json({ error: 'Villa kom upp' }, 500);
  }
});

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

// Manually trigger review (admin only)
app.post('/trigger', async (c) => {
  let passwordFromBody: string | undefined;
  try {
    const body = await c.req.json<{ password?: string }>();
    passwordFromBody = body.password;
  } catch {
    // No request body is okay if Authorization header is used.
  }

  const forbidden = requireAdmin(c, passwordFromBody);
  if (forbidden) return forbidden;

  console.log('[Review] Manual trigger requested');

  const stats = await runPostProcessingReview(c.env);

  return c.json({
    success: true,
    stats,
  });
});

export default app;
