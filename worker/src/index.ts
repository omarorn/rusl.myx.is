import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import identify from './routes/identify';
import stats from './routes/stats';
import rules from './routes/rules';
import quiz from './routes/quiz';

const app = new Hono<{ Bindings: Env }>();

// CORS for PWA
app.use('*', cors({
  origin: ['https://trash.myx.is', 'http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Health check (API only)
app.get('/api', (c) => {
  return c.json({
    service: 'trash.myx.is',
    version: '1.1.0',
    status: 'ok',
    endpoints: [
      'POST /api/identify',
      'GET /api/stats',
      'GET /api/stats/leaderboard',
      'GET /api/stats/global',
      'GET /api/rules',
      'GET /api/rules/:sveitarfelag',
      'GET /api/quiz/random',
      'POST /api/quiz/answer',
      'POST /api/quiz/score',
      'GET /api/quiz/leaderboard',
      'GET /api/quiz/stats',
    ],
  });
});

// Mount routes
app.route('/api/identify', identify);
app.route('/api/stats', stats);
app.route('/api/rules', rules);
app.route('/api/quiz', quiz);

// 404 handler for API routes only
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Slóð finnst ekki' }, 404);
  }
  // Let static assets handle non-API routes
  return c.notFound();
});

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ error: 'Villa kom upp' }, 500);
});

export default app;
