// Image generation service using Gemini Flash Latest
// Used for cartoon effects and image editing

// Gemini Flash Latest for Image Generation
const GEMINI_IMAGE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export interface CartoonResult {
  success: boolean;
  cartoonImage?: string;  // base64 image
  error?: string;
}

export interface CropResult {
  success: boolean;
  croppedImage?: string;  // base64 image
  error?: string;
}

/**
 * Generate a cartoon version of an image using Gemini
 * Falls back to original image with CSS filter hint if generation fails
 */
export async function generateCartoonImage(
  imageBase64: string,
  apiKey: string | null,
  style: 'cute' | 'comic' | 'anime' = 'cute'
): Promise<CartoonResult> {
  try {
    if (!apiKey) {
      console.log('[ImageGen] No API key, falling back to CSS filter');
      return { success: false, error: 'No API key' };
    }

    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const stylePrompts = {
      cute: 'Transform this photo into a cute, kawaii-style cartoon illustration. Make it colorful, friendly, and appealing for a recycling app. Keep the main object recognizable but stylized.',
      comic: 'Transform this photo into a comic book style illustration with bold outlines, vibrant colors, and dramatic shading. Keep the main object recognizable.',
      anime: 'Transform this photo into an anime-style illustration with soft shading, large expressive features, and vibrant colors. Keep the main object recognizable.',
    };

    console.log('[ImageGen] Generating cartoon with Gemini, style:', style);

    const requestBody = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageData,
            },
          },
          {
            text: stylePrompts[style],
          },
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        temperature: 0.8,
      },
    };

    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageGen] Gemini API error:', response.status, errorText.substring(0, 200));
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: {
              mimeType: string;
              data: string;
            };
          }>;
        };
      }>;
    };

    // Find image in response
    const parts = data?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const cartoonImage = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log('[ImageGen] Cartoon generated successfully');
          return { success: true, cartoonImage };
        }
      }
    }

    console.log('[ImageGen] No image in response, falling back to CSS');
    return { success: false, error: 'No image generated' };
  } catch (error) {
    console.error('[ImageGen] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Crop an image based on normalized coordinates (0-1)
 * This is done server-side to handle crop_box from Gemini detection
 */
export async function cropImage(
  imageBase64: string,
  cropBox: { x: number; y: number; width: number; height: number }
): Promise<CropResult> {
  try {
    // For now, return the original image
    // TODO: Implement actual cropping using canvas or sharp library
    // Cloudflare Workers don't support canvas natively, so we'd need to use
    // a different approach or return crop coordinates to frontend

    console.log('[ImageGen] Crop requested:', cropBox);

    return {
      success: true,
      croppedImage: imageBase64,  // Return original for now
    };
  } catch (error) {
    console.error('[ImageGen] Crop error:', error);
    return { success: false, error: String(error) };
  }
}
