/**
 /**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image to fit within maxWidth and maxHeight (retaining aspect ratio),
 * and compresses it to a JPEG data URL with the specified quality.
 *
 * @param file The image file to compress
 * @param maxWidth Maximum width in pixels (default: 400)
 * @param maxHeight Maximum height in pixels (default: 600)
 * @param quality JPEG compression quality from 0 to 1 (default: 0.75)
 */
export function compressImage(
  file: File,
  maxWidth = 400,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Only process images
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and clamp to max dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available.'));
          return;
        }

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
