// worker/src/routes/trips.ts
import { Hono } from 'hono';
import type { Env, SorpaTrip, TripItem, TripStatus } from '../types';

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

export default trips;
