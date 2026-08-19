/**
 * Avatar & Media Compression Utilities
 *
 * Provides client-side square crop and compression for avatars and covers.
 * Prevents uploading multi-megabyte uncompressed photos, saving bandwidth & storage.
 */

export interface ProcessImageOptions {
  maxDimension?: number;
  quality?: number;
  squareCrop?: boolean;
}

export async function processAndCompressImage(
  file: File | Blob,
  options: ProcessImageOptions = {}
): Promise<Blob> {
  const {
    maxDimension = 512,
    quality = 0.85,
    squareCrop = false,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        let srcX = 0;
        let srcY = 0;
        let srcW = width;
        let srcH = height;

        if (squareCrop) {
          // Center-crop to a 1:1 square
          const size = Math.min(width, height);
          srcX = (width - size) / 2;
          srcY = (height - size) / 2;
          srcW = size;
          srcH = size;

          // Scale output dimension
          const outSize = Math.min(size, maxDimension);
          canvas.width = outSize;
          canvas.height = outSize;
        } else {
          // Maintain aspect ratio while scaling down
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Convert to webp if supported, otherwise jpeg
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
