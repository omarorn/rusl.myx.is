// worker/src/routes/trips.ts
import { Hono } from 'hono';
import type { Env, SorpaTrip, TripItem, TripStatus, BinType } from '../types';
import { mapToSorpaBin, getSorpaBinInfo } from '../services/sorpa-mapping';

const trips = new Hono<{ Bindings: Env }>();

// POST /api/trips - Create new trip
trips.post('/', async (c) => {
  const body = await c.req.json<{ userHash: string; stationId?: string }>();

  if (!body.userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  // Check for existing loading trip
  const existing = await c.env.DB.prepare(
    'SELECT id FROM sorpa_trips WHERE user_hash = ? AND status = ?'
  ).bind(body.userHash, 'loading').first();

  if (existing) {
    return c.json({ error: 'Ferð í vinnslu þegar til', tripId: existing.id }, 409);
  }

  // Create new trip
  const result = await c.env.DB.prepare(`
    INSERT INTO sorpa_trips (user_hash, station_id, status)
    VALUES (?, ?, 'loading')
    RETURNING *
  `).bind(body.userHash, body.stationId || null).first<SorpaTrip>();

  return c.json({ trip: result }, 201);
});

// GET /api/trips/:id - Get trip with items
trips.get('/:id', async (c) => {
  const id = c.req.param('id');

  const trip = await c.env.DB.prepare(
    'SELECT * FROM sorpa_trips WHERE id = ?'
  ).bind(id).first<SorpaTrip>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  const itemsResult = await c.env.DB.prepare(
    'SELECT * FROM trip_items WHERE trip_id = ? ORDER BY scanned_at'
  ).bind(id).all<TripItem>();

  return c.json({
    trip,
    items: itemsResult.results || [],
    itemCount: itemsResult.results?.length || 0,
  });
});

// GET /api/trips - Get user's trips
trips.get('/', async (c) => {
  const userHash = c.req.query('userHash');
  const status = c.req.query('status') as TripStatus | undefined;

  if (!userHash) {
    return c.json({ error: 'userHash vantar' }, 400);
  }

  let query = 'SELECT * FROM sorpa_trips WHERE user_hash = ?';
  const params: (string | TripStatus)[] = [userHash];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT 20';

  const result = await c.env.DB.prepare(query).bind(...params).all<SorpaTrip>();

  return c.json({
    trips: result.results || [],
    count: result.results?.length || 0,
  });
});

// POST /api/trips/:id/items - Add item to trip
trips.post('/:id/items', async (c) => {
  const tripId = c.req.param('id');
  const body = await c.req.json<{
    itemName: string;
    homeBin: BinType;
    confidence?: number;
    imageKey?: string;
    scanMode?: 'item' | 'batch' | 'voice' | 'continuous';
  }>();

  if (!body.itemName || !body.homeBin) {
    return c.json({ error: 'itemName og homeBin vantar' }, 400);
  }

  // Verify trip exists and is in loading state
  const trip = await c.env.DB.prepare(
    'SELECT id, status FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<{ id: string; status: string }>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status !== 'loading') {
    return c.json({ error: 'Ferð er ekki í hleðslu' }, 400);
  }

  // Map to SORPA bin
  const sorpaBin = mapToSorpaBin(body.itemName, body.homeBin);
  const binInfo = getSorpaBinInfo(sorpaBin);

  // Insert item
  const result = await c.env.DB.prepare(`
    INSERT INTO trip_items (trip_id, item_name, home_bin, sorpa_bin, ramp_number, confidence, image_key, scan_mode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `).bind(
    tripId,
    body.itemName,
    body.homeBin,
    sorpaBin,
    binInfo.typical_ramp,
    body.confidence || null,
    body.imageKey || null,
    body.scanMode || 'item'
  ).first<TripItem>();

  return c.json({
    item: result,
    sorpaBinInfo: binInfo,
  }, 201);
});

// PUT /api/trips/:id/complete - Mark trip as completed
trips.put('/:id/complete', async (c) => {
  const tripId = c.req.param('id');

  const trip = await c.env.DB.prepare(
    'SELECT * FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<SorpaTrip>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status === 'completed') {
    return c.json({ error: 'Ferð er þegar lokið' }, 400);
  }

  // Count items
  const itemCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM trip_items WHERE trip_id = ?'
  ).bind(tripId).first<{ count: number }>();

  // Update trip status
  await c.env.DB.prepare(`
    UPDATE sorpa_trips
    SET status = 'completed', completed_at = unixepoch()
    WHERE id = ?
  `).bind(tripId).run();

  // Award points (10 points per item)
  const points = (itemCount?.count || 0) * 10;

  if (trip.user_hash && points > 0) {
    await c.env.DB.prepare(`
      INSERT INTO users (user_hash, total_scans, total_points)
      VALUES (?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        total_points = total_points + excluded.total_points
    `).bind(trip.user_hash, 0, points).run();
  }

  return c.json({
    success: true,
    tripId,
    itemCount: itemCount?.count || 0,
    pointsAwarded: points,
  });
});

// DELETE /api/trips/:id/items/:itemId - Remove item from trip
trips.delete('/:id/items/:itemId', async (c) => {
  const tripId = c.req.param('id');
  const itemId = c.req.param('itemId');

  // Verify trip is in loading state
  const trip = await c.env.DB.prepare(
    'SELECT status FROM sorpa_trips WHERE id = ?'
  ).bind(tripId).first<{ status: string }>();

  if (!trip) {
    return c.json({ error: 'Ferð finnst ekki' }, 404);
  }

  if (trip.status !== 'loading') {
    return c.json({ error: 'Ferð er ekki í hleðslu' }, 400);
  }

  const result = await c.env.DB.prepare(
    'DELETE FROM trip_items WHERE id = ? AND trip_id = ?'
  ).bind(itemId, tripId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Hlutur finnst ekki' }, 404);
  }

  return c.json({ success: true });
});

export default trips;
