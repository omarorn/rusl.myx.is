import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAdmin } from '../services/admin-auth';

const admin = new Hono<{ Bindings: Env }>();

interface QuizImage {
  id: string;
  image_key: string;
  item: string;
  bin: string;
  reason: string;
  confidence: number;
  submitted_by: string;
  approved: number;
  times_shown: number;
  times_correct: number;
  created_at: number;
}

// GET /api/admin/images - List all images with filtering
admin.get('/images', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;
  const status = c.req.query('status') || 'all'; // all, approved, pending, rejected
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    let query = 'SELECT * FROM quiz_images';
    const params: (string | number)[] = [];

    if (status === 'approved') {
      query += ' WHERE approved = 1';
    } else if (status === 'pending') {
      query += ' WHERE approved = 0';
    } else if (status === 'rejected') {
      query += ' WHERE approved = -1';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const images = await env.DB.prepare(query).bind(...params).all<QuizImage>();

    // Get total counts
    const counts = await env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN approved = -1 THEN 1 ELSE 0 END) as rejected
      FROM quiz_images
    `).first<{ total: number; approved: number; pending: number; rejected: number }>();

    return c.json({
      success: true,
      images: images.results || [],
      counts: counts || { total: 0, approved: 0, pending: 0, rejected: 0 },
      pagination: { limit, offset },
    });
  } catch (err) {
    console.error('Admin images error:', err);
    return c.json({ error: 'Villa við að sækja myndir' }, 500);
  }
});

// PUT /api/admin/images/:id - Update image (approve, reject, edit)
admin.put('/images/:id', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;
  const id = c.req.param('id');

  try {
    const body = await c.req.json<{
      approved?: number; // 1 = approved, 0 = pending, -1 = rejected
      item?: string;
      bin?: string;
      reason?: string;
    }>();

    // Build update query dynamically
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (body.approved !== undefined) {
      updates.push('approved = ?');
      params.push(body.approved);
    }
    if (body.item) {
      updates.push('item = ?');
      params.push(body.item);
    }
    if (body.bin) {
      updates.push('bin = ?');
      params.push(body.bin);
    }
    if (body.reason) {
      updates.push('reason = ?');
      params.push(body.reason);
    }

    if (updates.length === 0) {
      return c.json({ error: 'Ekkert að uppfæra' }, 400);
    }

    params.push(id);
    const query = `UPDATE quiz_images SET ${updates.join(', ')} WHERE id = ?`;
    await env.DB.prepare(query).bind(...params).run();

    return c.json({ success: true, message: 'Mynd uppfærð' });
  } catch (err) {
    console.error('Admin update error:', err);
    return c.json({ error: 'Villa við að uppfæra mynd' }, 500);
  }
});

// DELETE /api/admin/images/:id - Delete single image
admin.delete('/images/:id', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;
  const id = c.req.param('id');

  try {
    // Get image key first
    const image = await env.DB.prepare(
      'SELECT image_key FROM quiz_images WHERE id = ?'
    ).bind(id).first<{ image_key: string }>();

    if (!image) {
      return c.json({ error: 'Mynd fannst ekki' }, 404);
    }

    // Delete from R2
    try {
      await env.IMAGES.delete(image.image_key);
    } catch (e) {
      console.error('Failed to delete R2 image:', e);
    }

    // Delete from DB
    await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(id).run();

    return c.json({ success: true, message: 'Mynd eytt' });
  } catch (err) {
    console.error('Admin delete error:', err);
    return c.json({ error: 'Villa við að eyða mynd' }, 500);
  }
});

// POST /api/admin/images/batch - Batch approve/reject
admin.post('/images/batch', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;

  try {
    const body = await c.req.json<{
      ids: string[];
      action: 'approve' | 'reject' | 'delete';
    }>();

    if (!body.ids || body.ids.length === 0) {
      return c.json({ error: 'Engar myndir valdar' }, 400);
    }

    let count = 0;

    if (body.action === 'delete') {
      // Get image keys
      const placeholders = body.ids.map(() => '?').join(',');
      const images = await env.DB.prepare(
        `SELECT id, image_key FROM quiz_images WHERE id IN (${placeholders})`
      ).bind(...body.ids).all<{ id: string; image_key: string }>();

      // Delete from R2 and DB
      for (const img of images.results || []) {
        try {
          await env.IMAGES.delete(img.image_key);
          await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(img.id).run();
          count++;
        } catch (e) {
          console.error('Failed to delete:', img.id, e);
        }
      }
    } else {
      const approved = body.action === 'approve' ? 1 : -1;
      const placeholders = body.ids.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `UPDATE quiz_images SET approved = ? WHERE id IN (${placeholders})`
      ).bind(approved, ...body.ids).run();
      count = result.meta.changes || body.ids.length;
    }

    return c.json({
      success: true,
      message: `${count} myndir ${body.action === 'approve' ? 'samþykktar' : body.action === 'reject' ? 'hafnaðar' : 'eyddar'}`,
    });
  } catch (err) {
    console.error('Admin batch error:', err);
    return c.json({ error: 'Villa við að vinna runuaðgerð' }, 500);
  }
});

// GET /api/admin/stats - Admin dashboard stats
admin.get('/stats', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;

  try {
    const imageStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_images,
        SUM(CASE WHEN approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN approved = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN approved = -1 THEN 1 ELSE 0 END) as rejected,
        SUM(times_shown) as total_plays,
        SUM(times_correct) as total_correct
      FROM quiz_images
    `).first();

    const userStats = await env.DB.prepare(`
      SELECT COUNT(*) as total_users, SUM(total_scans) as total_scans
      FROM users
    `).first();

    const recentScans = await env.DB.prepare(`
      SELECT item, bin, confidence, created_at
      FROM scans
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return c.json({
      success: true,
      images: imageStats,
      users: userStats,
      recentScans: recentScans.results || [],
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return c.json({ error: 'Villa við að sækja tölfræði' }, 500);
  }
});

// GET /api/admin/sync - Compare R2 bucket with DB, find orphans
admin.get('/sync', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;

  try {
    // 1. List all R2 objects with quiz/ prefix
    const r2Objects: string[] = [];
    let cursor: string | undefined;

    do {
      const list = await env.IMAGES.list({
        prefix: 'quiz/',
        cursor,
        limit: 1000,
      });

      for (const obj of list.objects) {
        r2Objects.push(obj.key);
      }

      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    // 2. Get all image_keys from DB
    const dbImages = await env.DB.prepare(
      'SELECT id, image_key, item, bin FROM quiz_images'
    ).all<{ id: string; image_key: string; item: string; bin: string }>();

    const dbImageKeys = new Set(dbImages.results?.map(img => img.image_key) || []);
    const r2Keys = new Set(r2Objects);

    // 3. Find orphaned DB records (image_key exists in DB but not in R2)
    const orphanedInDb = dbImages.results?.filter(img => !r2Keys.has(img.image_key)) || [];

    // 4. Find orphaned R2 files (exist in R2 but not in DB)
    const orphanedInR2 = r2Objects.filter(key => !dbImageKeys.has(key));

    return c.json({
      success: true,
      stats: {
        r2_total: r2Objects.length,
        db_total: dbImages.results?.length || 0,
        orphaned_in_db: orphanedInDb.length,
        orphaned_in_r2: orphanedInR2.length,
      },
      orphanedInDb,
      orphanedInR2,
    });
  } catch (err) {
    console.error('Admin sync error:', err);
    return c.json({ error: 'Villa við samstillingu' }, 500);
  }
});

// POST /api/admin/sync/cleanup - Clean up orphaned records
admin.post('/sync/cleanup', async (c) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;

  const env = c.env;

  try {
    const body = await c.req.json<{
      cleanDb?: boolean;  // Remove DB records where R2 file is missing
      cleanR2?: boolean;  // Remove R2 files where DB record is missing
    }>();

    // First, get the sync status
    const r2Objects: string[] = [];
    let cursor: string | undefined;

    do {
      const list = await env.IMAGES.list({
        prefix: 'quiz/',
        cursor,
        limit: 1000,
      });

      for (const obj of list.objects) {
        r2Objects.push(obj.key);
      }

      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    const dbImages = await env.DB.prepare(
      'SELECT id, image_key FROM quiz_images'
    ).all<{ id: string; image_key: string }>();

    const dbImageKeys = new Set(dbImages.results?.map(img => img.image_key) || []);
    const r2Keys = new Set(r2Objects);

    let dbDeleted = 0;
    let r2Deleted = 0;

    // Clean orphaned DB records
    if (body.cleanDb) {
      const orphanedInDb = dbImages.results?.filter(img => !r2Keys.has(img.image_key)) || [];
      for (const img of orphanedInDb) {
        await env.DB.prepare('DELETE FROM quiz_images WHERE id = ?').bind(img.id).run();
        dbDeleted++;
      }
    }

    // Clean orphaned R2 files
    if (body.cleanR2) {
      const orphanedInR2 = r2Objects.filter(key => !dbImageKeys.has(key));
      for (const key of orphanedInR2) {
        await env.IMAGES.delete(key);
        r2Deleted++;
      }
    }

    return c.json({
      success: true,
      message: `Hreinsun lokið: ${dbDeleted} DB færslur, ${r2Deleted} R2 skrár`,
      dbDeleted,
      r2Deleted,
    });
  } catch (err) {
    console.error('Admin cleanup error:', err);
    return c.json({ error: 'Villa við hreinsun' }, 500);
  }
});

export default admin;
