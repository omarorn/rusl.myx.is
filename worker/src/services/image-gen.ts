// Image generation service using Gemini 2.5 Flash Image
// Used for cartoon effects and image editing

const GEMINI_IMAGE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent';

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
 * Generate a cartoon version of an image using Gemini 2.5 Flash Image
 */
export async function generateCartoonImage(
  imageBase64: string,
  apiKey: string,
  style: 'cute' | 'comic' | 'anime' = 'cute'
): Promise<CartoonResult> {
  try {
    if (!apiKey) {
      return { success: false, error: 'No API key provided' };
    }

    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const stylePrompts = {
      cute: 'Transform this image into a cute, kawaii-style cartoon illustration. Make it colorful and friendly, suitable for a recycling app. Keep the main objects recognizable.',
      comic: 'Transform this image into a comic book style illustration with bold outlines and vibrant colors. Keep the main objects recognizable.',
      anime: 'Transform this image into an anime-style illustration. Make it colorful and appealing. Keep the main objects recognizable.',
    };

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
      },
    };

    console.log('[ImageGen] Generating cartoon image, style:', style);

    const response = await fetch(`${GEMINI_IMAGE_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ImageGen] API error:', response.status, errorText.substring(0, 300));
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

    // Find the image part in the response
    const parts = data?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const cartoonImage = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log('[ImageGen] Cartoon generated successfully');
          return { success: true, cartoonImage };
        }
      }
    }

    console.error('[ImageGen] No image in response');
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
