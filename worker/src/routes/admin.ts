import { Hono } from 'hono';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// Admin password - same as existing quiz admin
const ADMIN_PASSWORD = 'bobba';

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

// Middleware to check admin password
async function checkPassword(c: any): Promise<boolean> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const password = authHeader.replace('Bearer ', '');
  return password === ADMIN_PASSWORD;
}

// GET /api/admin/images - List all images with filtering
admin.get('/images', async (c) => {
  if (!await checkPassword(c)) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

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
  if (!await checkPassword(c)) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

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
  if (!await checkPassword(c)) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

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
  if (!await checkPassword(c)) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

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
  if (!await checkPassword(c)) {
    return c.json({ error: 'Rangt lykilorð' }, 403);
  }

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

export default admin;
