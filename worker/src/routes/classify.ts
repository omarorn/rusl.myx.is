import { Hono } from 'hono';
import { Env, ClassifyRequest, ClassifyResponse, BINS, ICELAND_OVERRIDES, BinType } from '../types';
import { classifyWithHuggingFace, classifyWithGemini } from '../services/classifier';
import { getMunicipality } from '../services/location';
import { updateUserStats, getRandomFunFact } from '../services/gamification';
import { checkRateLimit } from '../services/ratelimit';

const app = new Hono<{ Bindings: Env }>();

app.post('/', async (c) => {
  const env = c.env;
  const clientIP = c.req.header('cf-connecting-ip') || 'unknown';
  
  // Rate limiting: 30 requests per minute
  const rateLimitOk = await checkRateLimit(env.CACHE, clientIP, 30);
  if (!rateLimitOk) {
    return c.json({ error: 'Hægðu á þér! 30 skannanir á mínútu hámark.' }, 429);
  }

  try {
    const body = await c.req.json<ClassifyRequest>();
    const { image, lat, lng, device_id, source = 'pwa' } = body;

    if (!image) {
      return c.json({ error: 'Mynd vantar' }, 400);
    }

    // Get municipality from coordinates
    const municipality = lat && lng ? await getMunicipality(lat, lng) : 'reykjavik';

    // Step 1: Try HuggingFace classifier first (fast, cheap)
    let result = await classifyWithHuggingFace(image, env.HF_API_KEY);
    
    // Step 2: If low confidence or edge case detected, use Gemini
    const needsGemini = result.confidence < 0.8 || 
                        result.item.toLowerCase().includes('plast') ||
                        result.item.toLowerCase().includes('plastic');
    
    if (needsGemini && env.GEMINI_API_KEY) {
      result = await classifyWithGemini(image, municipality, env.GEMINI_API_KEY);
    }

    // Step 3: Apply Iceland-specific overrides
    const override = findOverride(result.item);
    if (override) {
      result.bin = override.bin;
      result.reason = override.reason;
    }

    // Get bin info
    const binInfo = BINS[result.bin];

    // Step 4: Save to database and update stats
    const userHash = device_id || generateHash(clientIP);
    const scanId = generateId();
    
    await env.DB.prepare(`
      INSERT INTO scans (id, created_at, user_hash, item, bin, confidence, sveitarfelag, lat, lng, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      scanId,
      Date.now(),
      userHash,
      result.item,
      result.bin,
      result.confidence,
      municipality,
      lat || null,
      lng || null,
      source
    ).run();

    // Update user stats (points, streak)
    const stats = await updateUserStats(env.DB, userHash);
    
    // Get random fun fact
    const funFact = await getRandomFunFact(env.DB);

    // Optional: Save image for debugging
    if (env.DEBUG_IMAGES === 'true') {
      const imageBuffer = Uint8Array.from(atob(image), c => c.charCodeAt(0));
      await env.IMAGES.put(`scans/${scanId}.jpg`, imageBuffer);
    }

    const response: ClassifyResponse = {
      success: true,
      item: result.item,
      bin: result.bin,
      bin_name: binInfo.name_is,
      bin_color: binInfo.color,
      reason: result.reason,
      confidence: result.confidence,
      points: stats.points_earned,
      streak: stats.current_streak,
      fun_fact: funFact,
      special_instructions: result.bin === 'recycling_center' 
        ? 'Þetta fer á næstu söfnunarstöð' 
        : undefined
    };

    return c.json(response);

  } catch (error) {
    console.error('Classify error:', error);
    return c.json({ 
      error: 'Villa kom upp', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Helper: Find Iceland override
function findOverride(item: string): { bin: BinType; reason: string } | null {
  const itemLower = item.toLowerCase();
  
  for (const [key, override] of Object.entries(ICELAND_OVERRIDES)) {
    if (itemLower.includes(key.replace('_', ' ')) || itemLower.includes(key)) {
      return override;
    }
  }
  
  // Check for 3D print indicators
  if (itemLower.includes('3d') || itemLower.includes('prent')) {
    return ICELAND_OVERRIDES['3d_print'];
  }
  
  return null;
}

// Helper: Generate random ID
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// Helper: Generate user hash from IP
function generateHash(input: string): string {
  // Simple hash - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'user_' + Math.abs(hash).toString(16);
}

export { app as classifyRoute };
