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

// Bin type to color mapping for visual consistency
const BIN_COLORS: Record<string, string> = {
  paper: '#3b82f6',     // Blue
  plastic: '#22c55e',   // Green
  food: '#a16207',      // Brown
  mixed: '#6b7280',     // Gray
  recycling_center: '#a855f7', // Purple
  deposit: '#ec4899',   // Pink
};

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
    bin?: string;
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

        // Primary object gets solid line, others get dashed
        const isPrimary = index === primaryIndex;

        // Use bin color if available, otherwise use default logic
        let color: string;
        if (isPrimary) {
          color = '#10b981'; // Always green for primary
        } else if (obj.bin && BIN_COLORS[obj.bin]) {
          color = BIN_COLORS[obj.bin];
        } else if (obj.is_trash) {
          color = '#f59e0b'; // Yellow for trash without bin info
        } else {
          color = '#6b7280'; // Gray for non-trash
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isPrimary ? 4 : 2;
        ctx.setLineDash(isPrimary ? [] : [5, 5]);

        ctx.strokeRect(x, y, w, h);

        // Draw label background
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        const binEmoji = obj.is_trash ? '🗑️' : '👀';
        const label = `${binEmoji} ${obj.item}`;
        const textMetrics = ctx.measureText(label);
        const padding = 6;
        const labelHeight = 22;

        // Label position - above the box, or inside if too close to top
        const labelY = y > labelHeight + 5 ? y - labelHeight - 2 : y + 2;

        ctx.fillRect(x, labelY, textMetrics.width + padding * 2, labelHeight);
        ctx.fillStyle = 'white';
        ctx.fillText(label, x + padding, labelY + 16);

        // Draw index number for multi-object
        if (objects.length > 1) {
          const numSize = 20;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x + w - numSize/2 - 2, y + numSize/2 + 2, numSize/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(index + 1), x + w - numSize/2 - 2, y + numSize/2 + 6);
          ctx.textAlign = 'left';
        }
      });

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageBase64;
  });
}
