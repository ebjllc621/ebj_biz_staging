/**
 * Universal Media Upload Modal - Type Definitions
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 */

import type { CropMetadata } from '@features/listings/components/NewListingModal/shared/ImageCropper';

// ============================================================================
// UPLOAD FLOW STATE
// ============================================================================

export type UploadFlowStep =
  | 'idle'
  | 'file-selected'
  | 'cropping'
  | 'uploading'
  | 'complete'
  | 'error';

export interface UploadFlowState {
  step: UploadFlowStep;
  /** Raw file selected by user (before crop) */
  selectedFile: File | null;
  /** Object URL for selected file preview (must be revoked on cleanup) */
  previewUrl: string | null;
  /** Data URL produced by cropper */
  croppedDataUrl: string | null;
  /** Crop metadata from EnhancedImageCropperModal */
  cropMetadata: CropMetadata | null;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Error message if step === 'error' */
  errorMessage: string | null;
}

// ============================================================================
// UPLOAD CONTEXT
// ============================================================================

/**
 * Context passed from the consumer to UniversalMediaUploadModal.
 * Determines which entity receives the uploaded file.
 */
export interface UploadContext {
  /** Entity type (e.g. 'listing', 'user', 'event') */
  entityType: string;
  /** Entity ID */
  entityId: number;
  /** Media type slot (e.g. 'gallery', 'logo', 'cover', 'avatar') */
  mediaType: string;
  /** Human-readable context name used for SEO filename generation (brain plan: listingName) */
  contextName?: string;
  /** Skip cropping step (e.g. for documents) */
  skipCropper?: boolean;
}

// ============================================================================
// SEO FIELDS
// ============================================================================

export interface SEOFields {
  /** Alt text for accessibility and search (required before upload) */
  altText: string;
  /** Optional title/tooltip text (max 60 chars) */
  titleText?: string;
}

// ============================================================================
// MEDIA UPLOAD RESULT
// ============================================================================

export interface MediaUploadResult {
  success: boolean;
  /** The uploaded File object (available on success) */
  file?: File;
  /** SEO-optimized filename used for the upload */
  seoFilename?: string;
  /** Alt text provided by user */
  altText?: string;
  /** Title text provided by user */
  titleText?: string;
  /** Crop metadata from Phase 1 cropper (if cropped) */
  cropMetadata?: CropMetadata;
  /** Preview URL for the uploaded file */
  previewUrl?: string;
  /** Media ID from server response */
  mediaId?: number;
  /** Error message (available on failure) */
  errorMessage?: string;
}

// ============================================================================
// FEATURE TIPS
// ============================================================================

export interface FeatureTip {
  /** Media type key this tip belongs to */
  mediaType: string;
  /** Title for this tip section */
  title: string;
  /** Detail tips list */
  tips: string[];
  /** SEO-specific guidance for alt text writing */
  seoGuidance: string;
  /** Example alt text for user reference */
  exampleAltText: string;
}
