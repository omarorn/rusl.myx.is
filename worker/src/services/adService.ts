import { Env } from '../types';

// Types
export type AdPlacement = 'result_banner' | 'stats_card' | 'quiz_reward' | 'splash';
export type SponsorCategory = 'municipality' | 'recycling' | 'sustainability' | 'retail' | 'utility' | 'nonprofit';

export interface Sponsor {
  id: string;
  name: string;
  name_is: string;
  logo_url: string;
  website_url: string;
  category: SponsorCategory;
  is_active: boolean;
}

export interface Campaign {
  id: string;
  sponsor_id: string;
  name: string;
  headline_is: string;
  body_is?: string;
  cta_text_is: string;
  cta_url?: string;
  image_url?: string;
  placement: AdPlacement;
  priority: number;
  status: string;
  // Targeting
  target_bins?: string[];
  target_regions?: string[];
}

export interface AdContext {
  bin?: string;
  item?: string;
  region?: string;
}

export interface SponsorAd {
  type: 'sponsor';
  campaign_id: string;
  sponsor: {
    name: string;
    name_is: string;
    logo_url: string;
    website_url: string;
  };
  creative: {
    headline_is: string;
    body_is?: string;
    cta_text_is: string;
    cta_url?: string;
    image_url?: string;
  };
}

export interface AdSenseAd {
  type: 'adsense';
  slot_id: string;
  format: 'banner' | 'rectangle' | 'native';
}

export type Ad = SponsorAd | AdSenseAd;

export interface AdResponse {
  success: boolean;
  ad?: Ad;
  impression_id?: string;
  fallback_to_adsense?: boolean;
}

// AdSense configuration
// Set slot_id values after AdSense account approval (format: 'ca-pub-XXXXX/YYYYY')
const ADSENSE_CONFIG: Record<AdPlacement, { slot_id: string; format: 'banner' | 'rectangle' | 'native' } | null> = {
  result_banner: null, // Set to { slot_id: 'ca-pub-XXXXX/YYYYY', format: 'banner' } when ready
  stats_card: null,    // Set to { slot_id: 'ca-pub-XXXXX/ZZZZZ', format: 'rectangle' } when ready
  quiz_reward: null,   // Rewarded ads need different setup
  splash: null,        // No AdSense for splash
};

/**
 * Get an ad for the specified placement
 */
export async function getAd(
  env: Env,
  placement: AdPlacement,
  context: AdContext = {},
  userHash?: string
): Promise<AdResponse> {
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];

  try {
    // First, try to get a sponsor ad
    const sponsorAd = await getSponsorAd(env, placement, context, today);

    if (sponsorAd) {
      // Record impression
      const impressionId = await recordImpression(env, sponsorAd.campaign_id, userHash || 'anonymous', placement, context);

      return {
        success: true,
        ad: sponsorAd,
        impression_id: impressionId,
      };
    }

    // Fallback to AdSense if configured
    const adsenseConfig = ADSENSE_CONFIG[placement];
    if (adsenseConfig) {
      return {
        success: true,
        ad: {
          type: 'adsense',
          ...adsenseConfig,
        },
        fallback_to_adsense: true,
      };
    }

    // No ad available
    return { success: false };
  } catch (error) {
    console.error('Error getting ad:', error);
    return { success: false };
  }
}

/**
 * Get a sponsor ad from the database
 */
async function getSponsorAd(
  env: Env,
  placement: AdPlacement,
  context: AdContext,
  today: string
): Promise<SponsorAd | null> {
  // Query active campaigns for this placement
  const result = await env.DB.prepare(`
    SELECT
      c.id as campaign_id,
      c.headline_is,
      c.body_is,
      c.cta_text_is,
      c.cta_url,
      c.image_url,
      c.target_bins,
      s.name,
      s.name_is,
      s.logo_url,
      s.website_url
    FROM campaigns c
    JOIN sponsors s ON c.sponsor_id = s.id
    WHERE c.placement = ?
      AND c.status = 'active'
      AND s.is_active = 1
      AND c.start_date <= ?
      AND c.end_date >= ?
    ORDER BY c.priority DESC
    LIMIT 5
  `).bind(placement, today, today).all<{
    campaign_id: string;
    headline_is: string;
    body_is: string | null;
    cta_text_is: string;
    cta_url: string | null;
    image_url: string | null;
    target_bins: string | null;
    name: string;
    name_is: string;
    logo_url: string;
    website_url: string;
  }>();

  if (!result.results || result.results.length === 0) {
    return null;
  }

  // Filter by targeting (if specified)
  let matchingCampaigns = result.results;

  if (context.bin) {
    matchingCampaigns = matchingCampaigns.filter(campaign => {
      if (!campaign.target_bins) return true; // No targeting = show to all
      try {
        const targetBins = JSON.parse(campaign.target_bins);
        return targetBins.includes(context.bin);
      } catch {
        return true;
      }
    });
  }

  // If no campaigns match targeting, fall back to any campaign
  const selectedCampaign = matchingCampaigns[0] || result.results[0];

  return {
    type: 'sponsor',
    campaign_id: selectedCampaign.campaign_id,
    sponsor: {
      name: selectedCampaign.name,
      name_is: selectedCampaign.name_is,
      logo_url: selectedCampaign.logo_url,
      website_url: selectedCampaign.website_url,
    },
    creative: {
      headline_is: selectedCampaign.headline_is,
      body_is: selectedCampaign.body_is || undefined,
      cta_text_is: selectedCampaign.cta_text_is,
      cta_url: selectedCampaign.cta_url || undefined,
      image_url: selectedCampaign.image_url || undefined,
    },
  };
}

/**
 * Record an ad impression
 */
async function recordImpression(
  env: Env,
  campaignId: string,
  userHash: string,
  placement: AdPlacement,
  context: AdContext
): Promise<string> {
  const impressionId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(`
    INSERT INTO ad_impressions (id, campaign_id, user_hash, placement, context_bin, context_item, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    impressionId,
    campaignId,
    userHash,
    placement,
    context.bin || null,
    context.item || null,
    now
  ).run();

  return impressionId;
}

/**
 * Record an ad click
 */
export async function recordClick(
  env: Env,
  impressionId: string,
  userHash: string
): Promise<boolean> {
  try {
    // Get the campaign ID from the impression
    const impression = await env.DB.prepare(`
      SELECT campaign_id FROM ad_impressions WHERE id = ?
    `).bind(impressionId).first<{ campaign_id: string }>();

    if (!impression) {
      return false;
    }

    const clickId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await env.DB.prepare(`
      INSERT INTO ad_clicks (id, impression_id, campaign_id, user_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(clickId, impressionId, impression.campaign_id, userHash, now).run();

    return true;
  } catch (error) {
    console.error('Error recording click:', error);
    return false;
  }
}

/**
 * Get ad statistics for a campaign
 */
export async function getCampaignStats(
  env: Env,
  campaignId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  impressions: number;
  clicks: number;
  ctr: number;
  unique_users: number;
}> {
  const start = startDate || '1970-01-01';
  const end = endDate || '2099-12-31';
  const startTs = new Date(start).getTime() / 1000;
  const endTs = new Date(end).getTime() / 1000;

  const impressions = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM ad_impressions
    WHERE campaign_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(campaignId, startTs, endTs).first<{ count: number }>();

  const clicks = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM ad_clicks
    WHERE campaign_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(campaignId, startTs, endTs).first<{ count: number }>();

  const uniqueUsers = await env.DB.prepare(`
    SELECT COUNT(DISTINCT user_hash) as count FROM ad_impressions
    WHERE campaign_id = ? AND created_at >= ? AND created_at <= ?
  `).bind(campaignId, startTs, endTs).first<{ count: number }>();

  const impressionCount = impressions?.count || 0;
  const clickCount = clicks?.count || 0;

  return {
    impressions: impressionCount,
    clicks: clickCount,
    ctr: impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0,
    unique_users: uniqueUsers?.count || 0,
  };
}

/**
 * List all sponsors
 */
export async function listSponsors(env: Env, activeOnly = true): Promise<Sponsor[]> {
  const query = activeOnly
    ? 'SELECT * FROM sponsors WHERE is_active = 1 ORDER BY name'
    : 'SELECT * FROM sponsors ORDER BY name';

  const result = await env.DB.prepare(query).all<Sponsor>();
  return result.results || [];
}

/**
 * List campaigns with optional filters
 */
export async function listCampaigns(
  env: Env,
  filters: { sponsorId?: string; status?: string; placement?: AdPlacement } = {}
): Promise<Campaign[]> {
  let query = 'SELECT * FROM campaigns WHERE 1=1';
  const bindings: (string | number)[] = [];

  if (filters.sponsorId) {
    query += ' AND sponsor_id = ?';
    bindings.push(filters.sponsorId);
  }

  if (filters.status) {
    query += ' AND status = ?';
    bindings.push(filters.status);
  }

  if (filters.placement) {
    query += ' AND placement = ?';
    bindings.push(filters.placement);
  }

  query += ' ORDER BY priority DESC, created_at DESC';

  const result = await env.DB.prepare(query).bind(...bindings).all<Campaign>();
  return result.results || [];
}
