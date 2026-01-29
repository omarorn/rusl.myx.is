import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import identify from './routes/identify';
import stats from './routes/stats';
import rules from './routes/rules';
import quiz from './routes/quiz';
import describe from './routes/describe';
import review from './routes/review';
import ads from './routes/ads';
import admin from './routes/admin';
import image from './routes/image';
import stations from './routes/stations';
import trips from './routes/trips';
import funfacts from './routes/funfacts';
import { runPostProcessingReview } from './services/review';

const app = new Hono<{ Bindings: Env }>();

// CORS for PWA
app.use('*', cors({
  origin: ['https://trash.myx.is', 'https://rusl.myx.is', 'http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check (API only)
app.get('/api', (c) => {
  return c.json({
    service: 'trash.myx.is',
    version: '1.2.0',
    status: 'ok',
    endpoints: [
      'POST /api/identify',
      'GET /api/stats',
      'GET /api/stats/leaderboard',
      'GET /api/stats/global',
      'GET /api/stats/recent',
      'GET /api/rules',
      'GET /api/rules/:sveitarfelag',
      'GET /api/quiz/random',
      'POST /api/quiz/answer',
      'POST /api/quiz/score',
      'GET /api/quiz/leaderboard',
      'GET /api/quiz/stats',
      'POST /api/describe',
      'GET /api/review',
      'GET /api/review/changes',
      'POST /api/review/flag',
      'POST /api/review/trigger',
      'GET /api/ads',
      'POST /api/ads/click',
      'GET /api/ads/sponsors',
      'GET /api/admin/images',
      'PUT /api/admin/images/:id',
      'DELETE /api/admin/images/:id',
      'POST /api/admin/images/batch',
      'GET /api/admin/stats',
      'POST /api/image/cartoon',
      'POST /api/image/crop',
      'POST /api/image/icon',
      'GET /api/stations',
      'GET /api/stations/:id',
      'POST /api/trips',
      'GET /api/trips',
      'GET /api/trips/:id',
      'POST /api/trips/:id/items',
      'PUT /api/trips/:id/complete',
      'DELETE /api/trips/:id/items/:itemId',
      'GET /api/funfacts',
      'GET /api/funfacts/history',
      'POST /api/funfacts/mark-seen',
      'GET /api/funfacts/random',
    ],
  });
});

// Mount routes
app.route('/api/identify', identify);
app.route('/api/stats', stats);
app.route('/api/rules', rules);
app.route('/api/quiz', quiz);
app.route('/api/describe', describe);
app.route('/api/review', review);
app.route('/api/ads', ads);
app.route('/api/admin', admin);
app.route('/api/image', image);
app.route('/api/stations', stations);
app.route('/api/trips', trips);
app.route('/api/funfacts', funfacts);

// 404 handler for API routes only
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Slóð finnst ekki' }, 404);
  }
  // For non-API routes, return simple 404 (static assets are handled by Cloudflare)
  return new Response('Not found', { status: 404 });
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Villa kom upp' }, 500);
});

// Scheduled handler for hourly post-processing review
async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log('[Cron] Starting scheduled review at', new Date().toISOString());

  ctx.waitUntil(
    runPostProcessingReview(env)
      .then((stats) => {
        console.log('[Cron] Review completed:', stats);
      })
      .catch((error) => {
        console.error('[Cron] Review failed:', error);
      })
  );
}

export default {
  fetch: app.fetch,
  scheduled,
};
