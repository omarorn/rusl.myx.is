import { Hono } from 'hono';
import { Env } from '../types';
import { requireAdmin } from '../services/admin-auth';
import {
  getAd,
  recordClick,
  listSponsors,
  listCampaigns,
  getCampaignStats,
  AdPlacement,
  AdContext,
} from '../services/adService';

const ads = new Hono<{ Bindings: Env }>();

ads.use('/admin/*', async (c, next) => {
  const forbidden = requireAdmin(c);
  if (forbidden) return forbidden;
  await next();
});

/**
 * GET /api/ads
 * Get an ad for the specified placement
 *
 * Query params:
 * - placement: 'result_banner' | 'stats_card' | 'quiz_reward' | 'splash'
 * - bin: optional bin type for targeting
 * - item: optional item name for targeting
 * - userHash: optional user identifier
 */
ads.get('/', async (c) => {
  const placement = c.req.query('placement') as AdPlacement;
  const bin = c.req.query('bin');
  const item = c.req.query('item');
  const userHash = c.req.query('userHash');

  if (!placement) {
    return c.json({ error: 'Placement er nauðsynlegur.' }, 400);
  }

  const validPlacements: AdPlacement[] = ['result_banner', 'stats_card', 'quiz_reward', 'splash'];
  if (!validPlacements.includes(placement)) {
    return c.json({ error: 'Ógilt placement.' }, 400);
  }

  const context: AdContext = {};
  if (bin) context.bin = bin;
  if (item) context.item = item;

  const result = await getAd(c.env, placement, context, userHash);

  return c.json(result);
});

/**
 * POST /api/ads/click
 * Record an ad click
 *
 * Body:
 * - impression_id: string
 * - userHash: optional string
 */
ads.post('/click', async (c) => {
  try {
    const body = await c.req.json<{ impression_id: string; userHash?: string }>();

    if (!body.impression_id) {
      return c.json({ error: 'Impression ID vantar.' }, 400);
    }

    const success = await recordClick(c.env, body.impression_id, body.userHash || 'anonymous');

    return c.json({ success });
  } catch (error) {
    return c.json({ error: 'Villa við að skrá smell.' }, 500);
  }
});

/**
 * GET /api/ads/sponsors
 * List all sponsors (public endpoint for display purposes)
 */
ads.get('/sponsors', async (c) => {
  const sponsors = await listSponsors(c.env, true);

  return c.json({
    success: true,
    sponsors: sponsors.map(s => ({
      id: s.id,
      name: s.name,
      name_is: s.name_is,
      logo_url: s.logo_url,
      website_url: s.website_url,
      category: s.category,
    })),
  });
});

// Admin routes

/**
 * GET /api/ads/admin/campaigns
 * List all campaigns (admin)
 */
ads.get('/admin/campaigns', async (c) => {
  const sponsorId = c.req.query('sponsor_id');
  const status = c.req.query('status');
  const placement = c.req.query('placement') as AdPlacement | undefined;

  const campaigns = await listCampaigns(c.env, { sponsorId, status, placement });

  return c.json({
    success: true,
    campaigns,
  });
});

/**
 * GET /api/ads/admin/stats/:campaignId
 * Get statistics for a campaign
 */
ads.get('/admin/stats/:campaignId', async (c) => {
  const campaignId = c.req.param('campaignId');
  const startDate = c.req.query('start_date');
  const endDate = c.req.query('end_date');

  const stats = await getCampaignStats(c.env, campaignId, startDate, endDate);

  return c.json({
    success: true,
    campaign_id: campaignId,
    stats,
  });
});

/**
 * POST /api/ads/admin/campaigns
 * Create a new campaign (simplified for MVP)
 */
ads.post('/admin/campaigns', async (c) => {
  try {
    const body = await c.req.json<{
      sponsor_id: string;
      name: string;
      headline_is: string;
      body_is?: string;
      cta_text_is?: string;
      cta_url?: string;
      image_url?: string;
      placement: AdPlacement;
      start_date: string;
      end_date: string;
      priority?: number;
      target_bins?: string[];
    }>();

    // Validate required fields
    if (!body.sponsor_id || !body.name || !body.headline_is || !body.placement || !body.start_date || !body.end_date) {
      return c.json({ error: 'Nauðsynlegir reitir vantar.' }, 400);
    }

    const campaignId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(`
      INSERT INTO campaigns (
        id, sponsor_id, name, headline_is, body_is, cta_text_is, cta_url, image_url,
        placement, start_date, end_date, priority, target_bins, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).bind(
      campaignId,
      body.sponsor_id,
      body.name,
      body.headline_is,
      body.body_is || null,
      body.cta_text_is || 'Læra meira',
      body.cta_url || null,
      body.image_url || null,
      body.placement,
      body.start_date,
      body.end_date,
      body.priority || 0,
      body.target_bins ? JSON.stringify(body.target_bins) : null,
      now
    ).run();

    return c.json({
      success: true,
      campaign_id: campaignId,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return c.json({ error: 'Villa við að búa til herferð.' }, 500);
  }
});

/**
 * POST /api/ads/admin/sponsors
 * Create a new sponsor (simplified for MVP)
 */
ads.post('/admin/sponsors', async (c) => {
  try {
    const body = await c.req.json<{
      name: string;
      name_is: string;
      logo_url: string;
      website_url: string;
      category: string;
      contact_email?: string;
    }>();

    if (!body.name || !body.name_is || !body.logo_url || !body.website_url || !body.category) {
      return c.json({ error: 'Nauðsynlegir reitir vantar.' }, 400);
    }

    const sponsorId = `sponsor_${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(`
      INSERT INTO sponsors (id, name, name_is, logo_url, website_url, category, contact_email, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      sponsorId,
      body.name,
      body.name_is,
      body.logo_url,
      body.website_url,
      body.category,
      body.contact_email || null,
      now
    ).run();

    return c.json({
      success: true,
      sponsor_id: sponsorId,
    });
  } catch (error) {
    console.error('Error creating sponsor:', error);
    return c.json({ error: 'Villa við að búa til styrktaraðila.' }, 500);
  }
});

export default ads;
