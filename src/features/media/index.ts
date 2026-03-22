/**
 * Media Feature - Top-Level Barrel Export
 *
 * Re-exports public components, hooks, and types from media sub-modules.
 *
 * NOTE: The directory sub-module (server-only, uses Node.js fs) is NOT
 * exported here to prevent client-side bundle inclusion.
 *
 * @module @features/media
 * @phase Phase 6 - Integration & Navigation Wiring
 */

// ============================================================================
// ADMIN MEDIA MANAGER
// ============================================================================

export { AdminMediaManagerPage } from './admin';
export type { UseMediaDirectoryReturn } from './admin';

// ============================================================================
// MEDIA MANAGER LITE (User Dashboard)
// ============================================================================

export { MediaManagerLiteModal } from './lite';
export type { MediaManagerLiteModalProps, MediaFeatureKey } from './lite';

// ============================================================================
// UNIVERSAL MEDIA UPLOAD
// ============================================================================

export { UniversalMediaUploadModal, UploadDropZone } from './upload';
export type { UploadContext, MediaUploadResult, SEOFields } from './upload';

// ============================================================================
// GALLERY DISPLAY
// ============================================================================

export { GalleryDisplay, GalleryGrid, GalleryMasonry, GalleryCarousel, MediaTypeFilter } from './gallery';
export { parseVideoUrl } from './gallery';
export type {
  GalleryLayout,
  GalleryItem,
  GalleryItemType,
  GalleryDisplayProps,
  LayoutRendererProps,
  VideoProvider,
  ParsedVideo,
  MediaFilterType,
  MediaTypeFilterProps
} from './gallery';
