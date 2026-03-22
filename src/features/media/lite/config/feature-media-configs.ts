/**
 * Feature Media Configurations
 *
 * Static configuration for all 5 media features in MediaManagerLite.
 *
 * @tier SIMPLE
 * @phase Phase 5 - Media Manager Lite (User Dashboard)
 * @authority docs/media/galleryformat/phases/PHASE_5_MEDIA_MANAGER_LITE_BRAIN_PLAN.md
 */

import type { FeatureConfig } from '../types/media-manager-lite-types';

// ============================================================================
// FEATURE CONFIGURATIONS
// ============================================================================

export const FEATURE_CONFIGS: FeatureConfig[] = [
  {
    key: 'gallery',
    label: 'Gallery',
    description: 'Showcase photos of your business',
    icon: 'Image',
    mediaType: 'gallery',
    storagePattern: 'json-array',
    listingColumn: 'gallery_images',
    acceptedFormats: 'image/jpeg,image/png,image/webp',
    maxFileSizeMB: 10,
    useCropper: true,
    defaultCropPreset: 'landscape-4-3',
    tierLimits: { essentials: 6, plus: 12, preferred: 100, premium: 100 }
  },
  {
    key: 'logo',
    label: 'Logo',
    description: 'Your business logo or icon',
    icon: 'CircleUser',
    mediaType: 'logo',
    storagePattern: 'single-url',
    listingColumn: 'logo_url',
    acceptedFormats: 'image/jpeg,image/png,image/webp,image/svg+xml',
    maxFileSizeMB: 5,
    useCropper: true,
    defaultCropPreset: 'square',
    tierLimits: { essentials: 1, plus: 1, preferred: 1, premium: 1 }
  },
  {
    key: 'cover',
    label: 'Cover Image',
    description: 'Header banner for your listing page',
    icon: 'Panorama',
    mediaType: 'cover',
    storagePattern: 'single-url',
    listingColumn: 'cover_image_url',
    acceptedFormats: 'image/jpeg,image/png,image/webp',
    maxFileSizeMB: 10,
    useCropper: true,
    defaultCropPreset: 'landscape-16-9',
    tierLimits: { essentials: 1, plus: 1, preferred: 1, premium: 1 }
  },
  {
    key: 'video-gallery',
    label: 'Video Gallery',
    description: 'Embed videos from YouTube, Vimeo, and more',
    icon: 'Film',
    mediaType: 'video',
    storagePattern: 'json-array',
    listingColumn: 'video_gallery',
    acceptedFormats: '',
    maxFileSizeMB: 0,
    useCropper: false,
    tierLimits: { essentials: 1, plus: 10, preferred: 50, premium: 50 }
  },
  {
    key: 'attachments',
    label: 'Attachments',
    description: 'Brochures, menus, catalogs, and documents',
    icon: 'Paperclip',
    mediaType: 'attachment',
    storagePattern: 'table',
    acceptedFormats: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png',
    maxFileSizeMB: 25,
    useCropper: false,
    tierLimits: { essentials: 0, plus: 3, preferred: 10, premium: 10 }
  }
];

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get feature configuration by key
 */
export function getFeatureConfig(key: string): FeatureConfig | undefined {
  return FEATURE_CONFIGS.find(f => f.key === key);
}

/**
 * Get tier limit for a feature
 */
export function getFeatureTierLimit(config: FeatureConfig, tier: string): number {
  return config.tierLimits[tier] ?? config.tierLimits['essentials'] ?? 0;
}
