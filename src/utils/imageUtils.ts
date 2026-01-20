/**
 * Crop an image using Canvas API based on normalized coordinates (0-1)
 * @param imageBase64 - Base64 encoded image
 * @param cropBox - Normalized coordinates { x, y, width, height } where values are 0-1
 * @returns Promise with cropped image as base64
 */
export async function cropImageClient(
  imageBase64: string,
  cropBox: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate pixel coordinates from normalized values
      const sx = Math.floor(cropBox.x * img.width);
      const sy = Math.floor(cropBox.y * img.height);
      const sWidth = Math.floor(cropBox.width * img.width);
      const sHeight = Math.floor(cropBox.height * img.height);

      // Ensure we don't exceed image bounds
      const clampedWidth = Math.min(sWidth, img.width - sx);
      const clampedHeight = Math.min(sHeight, img.height - sy);

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      canvas.width = clampedWidth;
      canvas.height = clampedHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw the cropped portion
      ctx.drawImage(
        img,
        sx, sy, clampedWidth, clampedHeight,
        0, 0, clampedWidth, clampedHeight
      );

      // Return as base64
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageBase64;
  });
}

/**
 * Draw crop box overlay on an image
 * @param imageBase64 - Base64 encoded image
 * @param objects - Array of detected objects with crop_box
 * @param primaryIndex - Index of the primary object to highlight
 * @returns Promise with image with overlay as base64
 */
export async function drawCropOverlay(
  imageBase64: string,
  objects: Array<{
    item: string;
    crop_box?: { x: number; y: number; width: number; height: number };
    is_trash: boolean;
  }>,
  primaryIndex: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Draw crop boxes for each detected object
      objects.forEach((obj, index) => {
        if (!obj.crop_box) return;

        const box = obj.crop_box;
        const x = box.x * img.width;
        const y = box.y * img.height;
        const w = box.width * img.width;
        const h = box.height * img.height;

        // Primary object gets green, others get yellow
        const isPrimary = index === primaryIndex;
        ctx.strokeStyle = isPrimary ? '#10b981' : (obj.is_trash ? '#f59e0b' : '#6b7280');
        ctx.lineWidth = isPrimary ? 3 : 2;
        ctx.setLineDash(isPrimary ? [] : [5, 5]);

        ctx.strokeRect(x, y, w, h);

        // Draw label
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = 'bold 14px sans-serif';
        const label = obj.item;
        const textMetrics = ctx.measureText(label);
        const padding = 4;

        ctx.fillRect(x, y - 20, textMetrics.width + padding * 2, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(label, x + padding, y - 6);
      });

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageBase64;
  });
}
