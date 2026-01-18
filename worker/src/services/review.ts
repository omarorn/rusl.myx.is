import type { Env, GeminiResponse, BinType } from '../types';
import { checkOverrides, getReasonText, BIN_INFO } from './iceland-rules';

// Use same model as main classifier for review (Gemini 2.0 Flash)
// TODO: Upgrade to Gemini Pro when available
const GEMINI_PRO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent';

// Claude API for deep thinking
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ReviewResult {
  item: string;
  bin: BinType;
  reason: string;
  confidence: number;
  changed: boolean;
}

interface ReviewStats {
  itemsReviewed: number;
  itemsChanged: number;
  durationMs: number;
  errors: string[];
}

const REVIEW_PROMPT = `Þú ert sérfræðingur í ruslaflokkun á Íslandi (SORPA svæðið).

Þú ert að yfirfara fyrri flokkun á mynd. Hugsaðu vel og gefðu þér tíma.

UPPRUNALEG FLOKKUN:
Hlutur: {original_item}
Tunna: {original_bin}
Ástæða: {original_reason}
Sjálfstraust: {original_confidence}

TUNNUR Á ÍSLANDI:
- paper: Pappír og pappi (blátt) - kassar, dagblöð, umbúðir úr pappa, TetraPak
- plastic: Plastumbúðir OG LITLAR málmumbúðir (grænt) - plastflöskur, dósir, álpappír
- food: Matarleifar í pappírspoka (brúnt) - ávextir, grænmeti, matreiðsluúrgangur
- mixed: Blandaður úrgangur (grátt) - 3D prentað plast, bioplast, óhrein umbúðir
- recycling_center: Endurvinnslustöð - gler, stórir málmhlutir, rafhlöður, frauðplast

MIKILVÆGAR REGLUR:
1. 3D prentað plast (PLA, ABS, PETG) → mixed (ALLTAF!)
2. Líffræðilegt plast (bioplastic, compostable) → mixed
3. TetraPak (mjólkurfernur, safafernur) → paper
4. Frauðplast (styrofoam) → recycling_center
5. Fitublettur á pappa → mixed
6. Matarleifar (banana, eplakjarna, brauð) → food

Skoðaðu myndina vandlega og staðfestu eða leiðréttu flokkun.

Svaraðu AÐEINS með JSON:
{
  "item": "nafn hlutarins á íslensku",
  "bin": "paper|plastic|food|mixed|recycling_center",
  "reason": "ítarleg skýring á íslensku",
  "confidence": 0.0-1.0,
  "changed": true/false
}`;

async function reviewWithGeminiPro(
  imageBase64: string,
  originalItem: string,
  originalBin: string,
  originalReason: string,
  originalConfidence: number,
  apiKey: string
): Promise<ReviewResult | null> {
  try {
    console.log('[Review] reviewWithGeminiPro called, image size:', Math.round(imageBase64.length / 1024), 'KB');

    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = REVIEW_PROMPT
      .replace('{original_item}', originalItem)
      .replace('{original_bin}', originalBin)
      .replace('{original_reason}', originalReason || 'Engin')
      .replace('{original_confidence}', String(originalConfidence || 0));

    console.log('[Review] Calling Gemini Pro API...');

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData,
            },
          },
          { text: prompt },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    console.log('[Review] Gemini Pro response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Review] Gemini Pro error:', response.status, errorText.substring(0, 500));
      throw new Error(`Gemini Pro API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    console.log('[Review] Gemini Pro raw response:', JSON.stringify(data).substring(0, 500));

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`No text in response, candidates: ${data?.candidates?.length}, raw: ${JSON.stringify(data).substring(0, 300)}`);
    }

    console.log('[Review] Gemini Pro text:', text.substring(0, 200));

    const jsonData = JSON.parse(text);
    const parsed = Array.isArray(jsonData) ? jsonData[0] : jsonData;

    if (!parsed || !parsed.item) {
      throw new Error(`Invalid parsed result: ${JSON.stringify(parsed).substring(0, 200)}`);
    }

    // Validate bin type
    const validBins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
    if (!validBins.includes(parsed.bin as BinType)) {
      parsed.bin = 'mixed';
    }

    return {
      item: parsed.item,
      bin: parsed.bin as BinType,
      reason: parsed.reason,
      confidence: parsed.confidence,
      changed: parsed.changed === true || parsed.bin !== originalBin,
    };
  } catch (error) {
    console.error('[Review] Gemini Pro error:', error);
    throw error;  // Re-throw to be captured by caller
  }
}

async function reviewWithClaude(
  imageBase64: string,
  originalItem: string,
  originalBin: string,
  originalReason: string,
  originalConfidence: number,
  apiKey: string
): Promise<ReviewResult | null> {
  try {
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = REVIEW_PROMPT
      .replace('{original_item}', originalItem)
      .replace('{original_bin}', originalBin)
      .replace('{original_reason}', originalReason || 'Engin')
      .replace('{original_confidence}', String(originalConfidence || 0));

    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageData,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    };

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('[Review] Claude error:', response.status);
      return null;
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
    };
    const text = data?.content?.[0]?.text;

    if (!text) {
      console.error('[Review] No text in Claude response');
      return null;
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed || !parsed.item) {
      return null;
    }

    // Validate bin type
    const validBins: BinType[] = ['paper', 'plastic', 'food', 'mixed', 'recycling_center'];
    if (!validBins.includes(parsed.bin as BinType)) {
      parsed.bin = 'mixed';
    }

    return {
      item: parsed.item,
      bin: parsed.bin as BinType,
      reason: parsed.reason,
      confidence: parsed.confidence,
      changed: parsed.changed === true || parsed.bin !== originalBin,
    };
  } catch (error) {
    console.error('[Review] Claude error:', error);
    return null;
  }
}

export async function runPostProcessingReview(env: Env): Promise<ReviewStats> {
  const startTime = Date.now();
  const errors: string[] = [];
  let itemsReviewed = 0;
  let itemsChanged = 0;

  console.log('[Review] Starting post-processing review...');

  try {
    // Get unreviewed items from the last 24 hours with low confidence
    const unreviewed = await env.DB.prepare(`
      SELECT id, image_key, item, bin, confidence
      FROM scans
      WHERE reviewed_at IS NULL
        AND image_key IS NOT NULL
        AND confidence < 0.9
        AND created_at > unixepoch() - 86400
      ORDER BY confidence ASC
      LIMIT 20
    `).all();

    console.log(`[Review] Found ${unreviewed.results?.length || 0} items to review`);

    if (!unreviewed.results || unreviewed.results.length === 0) {
      return { itemsReviewed: 0, itemsChanged: 0, durationMs: Date.now() - startTime, errors };
    }

    // Process each item
    for (const item of unreviewed.results) {
      try {
        // Get image from R2
        const imageKey = item.image_key as string;
        const imageObject = await env.IMAGES.get(imageKey);

        if (!imageObject) {
          console.log(`[Review] Image not found: ${imageKey}`);
          continue;
        }

        const imageBuffer = await imageObject.arrayBuffer();

        // Convert to base64 without stack overflow (chunk-based)
        const bytes = new Uint8Array(imageBuffer);
        let binary = '';
        const chunkSize = 0x8000; // 32KB chunks
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + chunkSize)));
        }
        const imageBase64 = btoa(binary);

        console.log(`[Review] Processing item ${item.id}: ${item.item}, image size: ${Math.round(imageBase64.length / 1024)}KB`);

        // Review with Gemini Pro first
        let result = await reviewWithGeminiPro(
          imageBase64,
          item.item as string,
          item.bin as string,
          '', // No reason stored in scans table
          item.confidence as number,
          env.GEMINI_API_KEY
        );

        const modelUsed = 'gemini_pro';

        if (!result) {
          errors.push(`Item ${item.id}: Gemini Pro returned null`);
          console.log(`[Review] No result from Gemini Pro for item ${item.id}`);
          continue;
        }

        // If Gemini Pro changed it, apply Iceland rules
        if (result) {
          // Check for overrides
          const overrideBin = checkOverrides(result.item);
          if (overrideBin) {
            result.bin = overrideBin;
          }
          result.reason = getReasonText(result.item, result.bin, 'gemini_pro');

          // Update the scan record (scans table has no reason column)
          await env.DB.prepare(`
            UPDATE scans
            SET item = ?,
                bin = ?,
                confidence = ?,
                reviewed_at = unixepoch(),
                reviewed_by = ?,
                original_item = ?,
                original_bin = ?,
                review_confidence = ?,
                review_reason = ?
            WHERE id = ?
          `).bind(
            result.item,
            result.bin,
            result.confidence,
            modelUsed,
            item.item,
            item.bin,
            result.confidence,
            result.reason,
            item.id
          ).run();

          itemsReviewed++;
          if (result.changed || result.bin !== item.bin) {
            itemsChanged++;
            console.log(`[Review] Changed: ${item.item} (${item.bin}) → ${result.item} (${result.bin})`);
          }
        }
      } catch (itemError) {
        const errMsg = itemError instanceof Error ? itemError.message : String(itemError);
        errors.push(`Item ${item.id}: ${errMsg}`);
        console.error(`[Review] Error processing item ${item.id}:`, itemError);
      }
    }

    // Log the review run
    await env.DB.prepare(`
      INSERT INTO review_log (items_reviewed, items_changed, model_used, duration_ms, errors)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      itemsReviewed,
      itemsChanged,
      'gemini_pro',
      Date.now() - startTime,
      errors.length > 0 ? JSON.stringify(errors) : null
    ).run();

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(errMsg);
    console.error('[Review] Fatal error:', error);
  }

  const stats: ReviewStats = {
    itemsReviewed,
    itemsChanged,
    durationMs: Date.now() - startTime,
    errors,
  };

  console.log(`[Review] Complete: ${itemsReviewed} reviewed, ${itemsChanged} changed in ${stats.durationMs}ms`);

  return stats;
}
