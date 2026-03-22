/**
 * Shared Media Upload Types
 * Used by MediaUploadSection across Events, Offers, Jobs
 *
 * @authority CLAUDE.md - Build Map v2.1
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 1 - Shared Media Upload Components
 */

import type { VideoProvider } from '@features/media/gallery/types/gallery-types';

/** Generic media item for upload sections (entity-agnostic) */
export interface MediaItem {
  id: number | string;
  media_type: 'image' | 'video';
  file_url: string;
  alt_text: string | null;
  sort_order: number;
  embed_url?: string | null;
  platform?: VideoProvider | null;
  source?: 'upload' | 'embed' | null;
}

/** Generic media limits (mirrors JobMediaLimits pattern) */
export interface MediaLimits {
  images: { current: number; limit: number; unlimited: boolean };
  videos: { current: number; limit: number; unlimited: boolean };
}

/** Props for MediaUploadSection */
export interface MediaUploadSectionProps {
  entityType: 'events' | 'offers' | 'jobs';
  entityId: number | string | null;
  media: MediaItem[];
  limits: MediaLimits;
  onMediaChange: (_media: MediaItem[]) => void;
  cropperContext?: string;
  disabled?: boolean;
  label?: string;
}

/** Props for VideoEmbedInput */
export interface VideoEmbedInputProps {
  videoUrls: string[];
  maxVideos: number;
  onUrlsChange: (_urls: string[]) => void;
  disabled?: boolean;
}

/** Platform brand colors for badges */
export const PLATFORM_COLORS: Record<VideoProvider, { bg: string; text: string; label: string }> = {
  youtube: { bg: 'bg-red-100', text: 'text-red-700', label: 'YouTube' },
  vimeo: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Vimeo' },
  tiktok: { bg: 'bg-gray-900', text: 'text-white', label: 'TikTok' },
  dailymotion: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Dailymotion' },
  rumble: { bg: 'bg-green-100', text: 'text-green-700', label: 'Rumble' },
  direct: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Direct Video' },
  unknown: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Unknown' },
};
