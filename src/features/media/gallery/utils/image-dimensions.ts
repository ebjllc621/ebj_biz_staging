/**
 * Client-side image dimension extraction
 *
 * @module @features/media/gallery/utils
 * @tier SIMPLE
 * @phase Phase 8C - Justified Layout + Enhanced Lightbox
 */

interface ImageDimensions {
  width: number;
  height: number;
}

const DEFAULT_DIMENSIONS: ImageDimensions = { width: 1200, height: 900 }; // 4:3 default
const VIDEO_DIMENSIONS: ImageDimensions = { width: 1280, height: 720 }; // 16:9 for videos

/**
 * Load image dimensions from URL via HTMLImageElement.
 * Returns default 4:3 dimensions if loading fails or times out.
 */
export async function getImageDimensions(
  url: string,
  timeoutMs = 5000
): Promise<ImageDimensions> {
  if (!url || typeof window === 'undefined') {
    return DEFAULT_DIMENSIONS;
  }

  return new Promise<ImageDimensions>((resolve) => {
    const img = new window.Image();
    const timer = setTimeout(() => {
      resolve(DEFAULT_DIMENSIONS);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve({
        width: img.naturalWidth || DEFAULT_DIMENSIONS.width,
        height: img.naturalHeight || DEFAULT_DIMENSIONS.height
      });
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(DEFAULT_DIMENSIONS);
    };

    img.src = url;
  });
}

/**
 * Batch-load dimensions for multiple items.
 * Items with existing width/height are returned as-is.
 * Only image items without dimensions trigger network loads.
 */
export async function resolveItemDimensions(
  items: Array<{ url: string; width?: number; height?: number; type: string }>
): Promise<Array<ImageDimensions>> {
  return Promise.all(
    items.map(async (item) => {
      if (item.width && item.height) {
        return { width: item.width, height: item.height };
      }
      if (item.type === 'video') {
        return VIDEO_DIMENSIONS;
      }
      return getImageDimensions(item.url);
    })
  );
}
