/**
 * Media Manager Lite - Type Definitions
 *
 * @tier SIMPLE
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 * @authority docs/media/galleryformat/phases/PHASE_5_MEDIA_MANAGER_LITE_BRAIN_PLAN.md
 */

// ============================================================================
// VIEW & FEATURE TYPES
// ============================================================================

/** Which view the modal is showing */
export type MediaManagerLiteView = 'grid' | 'feature';

/** Identifies a media feature */
export type MediaFeatureKey = 'gallery' | 'logo' | 'cover' | 'video-gallery' | 'attachments';

/** How a feature stores its media */
export type StoragePattern = 'json-array' | 'single-url' | 'table';

// ============================================================================
// FEATURE CONFIGURATION
// ============================================================================

/** Configuration for a single media feature */
export interface FeatureConfig {
  /** Unique key for the feature */
  key: MediaFeatureKey;
  /** Display label */
  label: string;
  /** Short description shown in card */
  description: string;
  /** Lucide icon name */
  icon: string;
  /** UploadContext.mediaType value */
  mediaType: string;
  /** How media is stored */
  storagePattern: StoragePattern;
  /** Listing column name for json-array/single-url features */
  listingColumn?: string;
  /** Accepted MIME types for the drop zone */
  acceptedFormats: string;
  /** Max file size in MB */
  maxFileSizeMB: number;
  /** Whether cropper is used */
  useCropper: boolean;
  /** Default crop preset key (if cropper enabled) */
  defaultCropPreset?: string;
  /** Tier limits: { essentials, plus, preferred, premium } */
  tierLimits: Record<string, number>;
}

// ============================================================================
// MEDIA ITEMS
// ============================================================================

/** A media item displayed in FeatureMediaView */
export interface FeatureMediaItem {
  /** Unique ID (URL string for listing-column items, number for table items) */
  id: string | number;
  /** Display URL for thumbnail */
  url: string;
  /** Display name */
  name: string;
  /** ALT text (if available) */
  altText?: string;
  /** Title text (if available) */
  titleText?: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Whether this item has complete SEO metadata */
  seoComplete: boolean;
  /**
   * media_files.id — populated when the item is backed by a media_files row.
   * Required for SEO save via /api/media/[id]/seo (Phase 6).
   * Undefined for listing-column items not yet linked to media_files.
   */
  mediaFileId?: number;
}

/** Feature summary for grid view card display */
export interface FeatureSummary {
  config: FeatureConfig;
  currentCount: number;
  maxCount: number;
  seoCompleteCount: number;
  seoTotalCount: number;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/** Props for the MediaManagerLite modal */
export interface MediaManagerLiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
}
