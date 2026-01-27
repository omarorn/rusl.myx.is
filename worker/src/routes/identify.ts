import { Hono } from 'hono';
import type { Env, IdentifyRequest, IdentifyResponse, UserStats } from '../types';
import { classifyItem } from '../services/classifier';
import { generateIcon } from '../services/gemini';

const identify = new Hono<{ Bindings: Env }>();

// Rate limit: 100 requests per minute per IP (generous for testing)
const RATE_LIMIT = 100;
const RATE_WINDOW = 60; // seconds

async function checkRateLimit(ip: string, cache: KVNamespace): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const current = await cache.get(key);
  
  if (!current) {
    await cache.put(key, '1', { expirationTtl: RATE_WINDOW });
    return true;
  }
  
  const count = parseInt(current, 10);
  if (count >= RATE_LIMIT) {
    return false;
  }
  
  await cache.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return true;
}

async function updateUserStats(
  db: D1Database, 
  userHash: string, 
  points: number
): Promise<UserStats> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get existing user or create new
  let user = await db.prepare(
    'SELECT * FROM users WHERE user_hash = ?'
  ).bind(userHash).first<UserStats>();
  
  if (!user) {
    // Create new user
    await db.prepare(`
      INSERT INTO users (user_hash, total_scans, total_points, current_streak, best_streak, last_scan_date)
      VALUES (?, 1, ?, 1, 1, ?)
    `).bind(userHash, points, today).run();
    
    return {
      user_hash: userHash,
      total_scans: 1,
      total_points: points,
      current_streak: 1,
      best_streak: 1,
      last_scan_date: today,
    };
  }
  
  // Calculate streak
  let newStreak = user.current_streak;
  const lastDate = user.last_scan_date;
  
  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      newStreak = user.current_streak + 1;
    } else {
      newStreak = 1; // Reset streak
    }
  }
  
  const newBestStreak = Math.max(user.best_streak, newStreak);
  
  // Update user
  await db.prepare(`
    UPDATE users SET 
      total_scans = total_scans + 1,
      total_points = total_points + ?,
      current_streak = ?,
      best_streak = ?,
      last_scan_date = ?
    WHERE user_hash = ?
  `).bind(points, newStreak, newBestStreak, today, userHash).run();
  
  return {
    user_hash: userHash,
    total_scans: user.total_scans + 1,
    total_points: user.total_points + points,
    current_streak: newStreak,
    best_streak: newBestStreak,
    last_scan_date: today,
  };
}

async function getRandomFunFact(db: D1Database, userHash: string): Promise<{ fact_is: string; id: number } | null> {
  // Try to get an unseen fun fact first
  const unseenResult = await db.prepare(`
    SELECT ff.id, ff.fact_is
    FROM fun_facts ff
    LEFT JOIN user_fun_facts uf ON ff.id = uf.fun_fact_id AND uf.user_hash = ?
    WHERE uf.id IS NULL
    ORDER BY RANDOM()
    LIMIT 1
  `).bind(userHash).first<{ id: number; fact_is: string }>();

  if (unseenResult) {
    return unseenResult;
  }

  // All facts have been seen - return any random fact
  const result = await db.prepare(
    'SELECT id, fact_is FROM fun_facts ORDER BY RANDOM() LIMIT 1'
  ).first<{ id: number; fact_is: string }>();

  return result || null;
}

async function logScan(
  db: D1Database,
  userHash: string,
  item: string,
  bin: string,
  confidence: number,
  sveitarfelag: string,
  imageKey: string | null,
  lat: number | null,
  lng: number | null
): Promise<void> {
  await db.prepare(`
    INSERT INTO scans (user_hash, item, bin, confidence, sveitarfelag, image_key, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(userHash, item, bin, confidence, sveitarfelag, imageKey, lat, lng).run();
}

// Save image to R2 and quiz_images table (with optional icon generation)
async function saveQuizImage(
  r2: R2Bucket,
  db: D1Database,
  imageBase64: string,
  item: string,
  bin: string,
  reason: string,
  confidence: number,
  userHash: string,
  geminiApiKey?: string
): Promise<{ imageKey: string; iconKey: string | null } | null> {
  if (!item) return null;

  try {
    // Generate filename: item_bin_timestamp.jpg
    const sanitizedItem = item.toLowerCase()
      .replace(/[^a-záéíóúýþðæö0-9]/gi, '_')
      .substring(0, 30);
    const timestamp = Date.now();
    const imageKey = `quiz/${sanitizedItem}_${bin}_${timestamp}.jpg`;
    const iconKey = `quiz/icons/${sanitizedItem}_${bin}_${timestamp}.png`;

    // Convert base64 to binary
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Save original image to R2
    await r2.put(imageKey, binaryData, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: { item, bin, userHash },
    });
    console.log(`[Quiz] Saved original image: ${imageKey}`);

    // Generate and save icon (in background, don't block response)
    let savedIconKey: string | null = null;
    if (geminiApiKey) {
      try {
        console.log(`[Quiz] Generating icon for: ${item}`);
        const iconResult = await generateIcon(imageBase64, geminiApiKey, item);

        if (iconResult.success && iconResult.iconImage) {
          // Convert icon base64 to binary
          const iconBase64Data = iconResult.iconImage.replace(/^data:image\/\w+;base64,/, '');
          const iconBinaryData = Uint8Array.from(atob(iconBase64Data), c => c.charCodeAt(0));

          // Determine content type from the data URL
          const contentTypeMatch = iconResult.iconImage.match(/^data:(image\/\w+);base64,/);
          const iconContentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png';

          // Save icon to R2
          await r2.put(iconKey, iconBinaryData, {
            httpMetadata: { contentType: iconContentType },
            customMetadata: { item, bin, userHash, type: 'icon' },
          });
          savedIconKey = iconKey;
          console.log(`[Quiz] Saved icon: ${iconKey}`);
        } else {
          console.log(`[Quiz] Icon generation failed: ${iconResult.error}`);
        }
      } catch (iconErr) {
        console.error('[Quiz] Icon generation error:', iconErr);
        // Don't fail the whole save if icon generation fails
      }
    }

    // Save to quiz_images table
    // Auto-approve if confidence >= 85%, otherwise pending admin review
    const autoApprove = confidence >= 0.85 ? 1 : 0;
    await db.prepare(`
      INSERT INTO quiz_images (image_key, icon_key, item, bin, reason, confidence, submitted_by, approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(imageKey, savedIconKey, item, bin, reason, confidence, userHash, autoApprove).run();

    if (autoApprove) {
      console.log(`[Quiz] Auto-approved image: ${item} (${Math.round(confidence * 100)}%)`);
    }

    return { imageKey, iconKey: savedIconKey };
  } catch (err) {
    console.error('[Quiz] Failed to save image:', err);
    return null;
  }
}

// POST /api/identify
identify.post('/', async (c) => {
  const env = c.env;
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';

  // Rate limit check
  const allowed = await checkRateLimit(ip, env.CACHE);
  if (!allowed) {
    return c.json<IdentifyResponse>({
      success: false,
      item: '',
      bin: 'mixed',
      binInfo: { name_is: '', color: '', icon: '' },
      reason: '',
      confidence: 0,
      points: 0,
      streak: 0,
      error: 'Of margar fyrirspurnir. Reyndu aftur eftir mínútu.',
    }, 429);
  }

  // Parse request
  let body: IdentifyRequest;
  try {
    body = await c.req.json<IdentifyRequest>();
  } catch {
    return c.json<IdentifyResponse>({
      success: false,
      item: '',
      bin: 'mixed',
      binInfo: { name_is: '', color: '', icon: '' },
      reason: '',
      confidence: 0,
      points: 0,
      streak: 0,
      error: 'Ógild fyrirspurn.',
    }, 400);
  }

  if (!body.image) {
    return c.json<IdentifyResponse>({
      success: false,
      item: '',
      bin: 'mixed',
      binInfo: { name_is: '', color: '', icon: '' },
      reason: '',
      confidence: 0,
      points: 0,
      streak: 0,
      error: 'Mynd vantar.',
    }, 400);
  }

  try {
    // Generate user hash if not provided
    const userHash = body.userHash || `anon_${ip.replace(/\./g, '_')}`;
    const language = body.language || 'is';
    const region = body.region || 'sorpa';

    // Classify the item
    const result = await classifyItem(body.image, env, language, region);

    // Ensure values are not undefined (D1 doesn't accept undefined)
    const item = result.item || 'Óþekkt hlutur';
    const bin = result.bin || 'mixed';
    const reason = result.reason || '';
    const confidence = result.confidence ?? 0;

    // Calculate points (10 base + 5 bonus for high confidence)
    const points = 10 + (confidence >= 0.9 ? 5 : 0);

    // Update user stats
    const stats = await updateUserStats(env.DB, userHash, points);

    // Get fun fact (prioritize unseen)
    const funFactResult = await getRandomFunFact(env.DB, userHash);
    const funFact = funFactResult?.fact_is || null;

    // Mark fun fact as seen if we got one
    if (funFactResult) {
      try {
        // Check if already seen
        const existing = await env.DB.prepare(
          'SELECT id FROM user_fun_facts WHERE user_hash = ? AND fun_fact_id = ?'
        ).bind(userHash, funFactResult.id).first();

        if (!existing) {
          // Insert new record
          await env.DB.prepare(
            'INSERT INTO user_fun_facts (user_hash, fun_fact_id, seen_at) VALUES (?, ?, unixepoch())'
          ).bind(userHash, funFactResult.id).run();
        }
      } catch (err) {
        console.error('Failed to mark fun fact as seen:', err);
        // Don't fail the whole request if this fails
      }
    }

    // Save image for quiz if confidence is good (> 0.7) and item was identified
    // Also generates and saves a cartoon icon version
    let imageKey: string | null = null;
    let iconKey: string | null = null;
    if (confidence >= 0.7 && item !== 'Óþekkt hlutur') {
      const saveResult = await saveQuizImage(
        env.IMAGES,
        env.DB,
        body.image,
        item,
        bin,
        reason,
        confidence,
        userHash,
        env.GEMINI_API_KEY // Pass API key for icon generation
      );
      if (saveResult) {
        imageKey = saveResult.imageKey;
        iconKey = saveResult.iconKey;
      }
    }

    // Log scan
    await logScan(
      env.DB,
      userHash,
      item,
      bin,
      confidence,
      'reykjavik', // TODO: detect from coords
      imageKey,
      body.lat ?? null,
      body.lng ?? null
    );

    return c.json<IdentifyResponse>({
      success: true,
      item,
      bin,
      binInfo: result.binInfo,
      reason,
      confidence,
      points,
      streak: stats.current_streak,
      funFact: funFact || undefined,
      dadJoke: result.dadJoke || undefined,
      imageKey: imageKey || undefined,
      // Multi-object detection for wide shots
      isWideShot: result.isWideShot,
      allObjects: result.allObjects,
      funnyComments: result.funnyComments,
    });
  } catch (err) {
    console.error('Identify error:', err);
    return c.json<IdentifyResponse>({
      success: false,
      item: '',
      bin: 'mixed',
      binInfo: { name_is: '', color: '', icon: '' },
      reason: '',
      confidence: 0,
      points: 0,
      streak: 0,
      error: `Villa: ${err instanceof Error ? err.message : 'Óþekkt villa'}`,
    }, 500);
  }
});

export default identify;
