// worker/src/routes/stations.ts
import { Hono } from 'hono';
import type { Env, SorpaStation, StationRamp } from '../types';

const stations = new Hono<{ Bindings: Env }>();

// GET /api/stations - List all stations
stations.get('/', async (c) => {
  const type = c.req.query('type'); // Optional filter

  let query = 'SELECT * FROM sorpa_stations';
  const params: string[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY name';

  const result = params.length > 0
    ? await c.env.DB.prepare(query).bind(...params).all<SorpaStation>()
    : await c.env.DB.prepare(query).all<SorpaStation>();

  return c.json({
    stations: result.results || [],
    count: result.results?.length || 0,
  });
});

// GET /api/stations/:id - Get station details with ramps
stations.get('/:id', async (c) => {
  const id = c.req.param('id');

  // Get station
  const station = await c.env.DB.prepare(
    'SELECT * FROM sorpa_stations WHERE id = ?'
  ).bind(id).first<SorpaStation>();

  if (!station) {
    return c.json({ error: 'Stöð finnst ekki' }, 404);
  }

  // Get ramps
  const rampsResult = await c.env.DB.prepare(
    'SELECT * FROM station_ramps WHERE station_id = ? ORDER BY ramp_number'
  ).bind(id).all<StationRamp & { bins: string }>();

  // Parse bins JSON
  const ramps = (rampsResult.results || []).map(ramp => ({
    ...ramp,
    bins: JSON.parse(ramp.bins),
  }));

  return c.json({
    station,
    ramps,
  });
});

export default stations;
