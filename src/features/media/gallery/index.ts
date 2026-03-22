/**
 * Gallery Sub-Module - Barrel Export
 *
 * @module @features/media/gallery
 * @phase Phase 8A - Gallery Display Standardization
 */

// Main orchestrator
export { GalleryDisplay } from './components/GalleryDisplay';

// Layout renderers (named exports for direct use if needed)
export { GalleryGrid } from './components/GalleryGrid';
export { GalleryMasonry } from './components/GalleryMasonry';
export { GalleryCarousel } from './components/GalleryCarousel';
export { GalleryJustified } from './components/GalleryJustified';

// Lightbox
export { PhotoSwipeLightbox } from './components/PhotoSwipeLightbox';

// Media type filter
export { MediaTypeFilter } from './components/MediaTypeFilter';

// Types
export type {
  GalleryLayout,
  VideoGalleryLayout,
  GalleryItem,
  GalleryItemType,
  GalleryDisplayProps,
  LayoutRendererProps,
  PhotoSwipeLightboxProps,
  VideoProvider,
  MediaFilterType,
  MediaTypeFilterProps
} from './types/gallery-types';

// Utilities
export { parseVideoUrl } from './utils/video-url-parser';
export type { ParsedVideo } from './utils/video-url-parser';
export { getImageDimensions, resolveItemDimensions } from './utils/image-dimensions';
