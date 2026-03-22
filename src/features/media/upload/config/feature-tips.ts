/**
 * Universal Media Upload Modal - Feature Tips Configuration
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 2 - Universal Media Upload Modal
 *
 * Static tips shown in FeatureTipsPanel based on media type context.
 */

import type { FeatureTip } from '../types/upload-types';

// ============================================================================
// FEATURE TIPS MAP
// ============================================================================

export const FEATURE_TIPS: Record<string, FeatureTip> = {
  gallery: {
    mediaType: 'gallery',
    title: 'Gallery Image Tips',
    tips: [
      'Use high-resolution images (minimum 1200px wide) for best quality.',
      'Landscape orientation (16:9) works best for gallery displays.',
      'Show your space, products, or team to build trust with visitors.',
      'Well-lit, clear photos perform better in search results.',
    ],
    seoGuidance:
      'Describe what is in the image specifically — search engines use alt text to understand your content.',
    exampleAltText: 'Freshly baked sourdough bread on wooden cutting board',
  },

  logo: {
    mediaType: 'logo',
    title: 'Logo Upload Tips',
    tips: [
      'Use a transparent PNG or high-resolution image for the sharpest result.',
      'Square or near-square logos display best across all contexts.',
      'Avoid text-heavy logos at small sizes — they become unreadable.',
      'Crop tightly around the logo with minimal white space.',
    ],
    seoGuidance:
      'Include your business name in the alt text (e.g. "Acme Corp logo") for brand recognition in search.',
    exampleAltText: "Mario's Italian Kitchen logo",
  },

  cover: {
    mediaType: 'cover',
    title: 'Cover Image Tips',
    tips: [
      'Cover images display at wide aspect ratios (16:9 or 3:1) — use landscape photos.',
      'Minimum recommended size: 1600 x 400px for sharp rendering.',
      'Choose an image that represents your brand or location at a glance.',
      'Avoid placing important content near the edges — it may be cropped on smaller screens.',
    ],
    seoGuidance:
      'Describe the scene or subject in your alt text to help search engines index your cover image.',
    exampleAltText: 'Cozy interior of downtown coffee shop with exposed brick walls',
  },

  video: {
    mediaType: 'video',
    title: 'Video Upload Tips',
    tips: [
      'MP4 (H.264) is the most compatible format across browsers and devices.',
      'Keep promotional videos under 2 minutes for best engagement.',
      'Ensure good lighting and clear audio for professional results.',
      'A descriptive thumbnail image will be generated automatically.',
    ],
    seoGuidance:
      'Use a descriptive title and alt text that summarizes the video content for accessibility.',
    exampleAltText: 'Chef preparing signature pasta dish in open kitchen',
  },

  avatar: {
    mediaType: 'avatar',
    title: 'Profile Avatar Tips',
    tips: [
      'Square images (1:1 ratio) work best — they display in circles in most contexts.',
      'Use a real photo or a professional logo for better trust and engagement.',
      'Minimum size: 200 x 200px to avoid pixelation.',
      'Keep the subject centered — edges may be clipped in circular displays.',
    ],
    seoGuidance:
      'Include your name or business name in the alt text for accessibility and search visibility.',
    exampleAltText: 'John Smith, owner of Smith Consulting',
  },

  banner: {
    mediaType: 'banner',
    title: 'Banner Image Tips',
    tips: [
      'Banners display at very wide ratios (up to 8:1) — use high-resolution landscape images.',
      'Minimum recommended width: 1920px for full-bleed banners.',
      'Keep key messaging away from the left and right edges to avoid cropping.',
      'Contrasting text overlays work best on images with a consistent background.',
    ],
    seoGuidance:
      'Describe the promotional content or campaign subject in the alt text for search indexing.',
    exampleAltText: 'Summer sale banner featuring outdoor dining patio',
  },

  document: {
    mediaType: 'document',
    title: 'Document Upload Tips',
    tips: [
      'PDF format is preferred for documents to ensure consistent rendering.',
      'Compress large PDFs before uploading to improve load times.',
      'Ensure document text is selectable (not a scanned image) for accessibility.',
      'Use descriptive filenames — they appear in download links.',
    ],
    seoGuidance:
      'Provide a clear, descriptive alt text summarizing the document purpose for screen readers.',
    exampleAltText: 'Restaurant dinner menu - Spring 2026',
  },
};

// ============================================================================
// HELPER
// ============================================================================

/**
 * Returns the FeatureTip for the given media type, or null if not found.
 *
 * @param mediaType - Media type key (e.g. 'gallery', 'logo', 'cover')
 */
export function getFeatureTip(mediaType: string): FeatureTip | null {
  return FEATURE_TIPS[mediaType] ?? null;
}
