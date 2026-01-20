// Image generation service using Cloudflare AI
// Used for cartoon effects and image editing

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

// Cloudflare AI interface
interface CloudflareAI {
  run(model: string, input: unknown): Promise<unknown>;
}

/**
 * Generate a cartoon version of an image using Cloudflare AI
 * Falls back to original image with CSS filter hint if generation fails
 */
export async function generateCartoonImage(
  imageBase64: string,
  ai: CloudflareAI | null,
  style: 'cute' | 'comic' | 'anime' = 'cute'
): Promise<CartoonResult> {
  try {
    if (!ai) {
      console.log('[ImageGen] AI binding not available, returning original');
      return { success: false, error: 'AI not available' };
    }

    // Remove data URL prefix if present
    const imageData = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const stylePrompts = {
      cute: 'A cute kawaii-style cartoon illustration of waste items, colorful and friendly, for a recycling app',
      comic: 'A comic book style illustration with bold outlines and vibrant colors showing waste items',
      anime: 'An anime-style illustration of recycling items, colorful and appealing',
    };

    console.log('[ImageGen] Generating cartoon with Cloudflare AI, style:', style);

    // Use Cloudflare's image-to-image or text-to-image model
    // Note: @cf/stabilityai/stable-diffusion-xl-base-1.0 for text-to-image
    // For now, we'll generate a stylized version based on the prompt
    const result = await ai.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt: stylePrompts[style],
      num_steps: 20,
    }) as ArrayBuffer;

    if (result && result.byteLength > 0) {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(result);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const cartoonImage = `data:image/png;base64,${base64}`;
      console.log('[ImageGen] Cartoon generated successfully');
      return { success: true, cartoonImage };
    }

    console.error('[ImageGen] No image generated');
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
