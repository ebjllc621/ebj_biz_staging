/**
 * Video URL Parser Utility
 *
 * Extracted from ListingVideoGallery.tsx for reuse across gallery components.
 * Handles: YouTube, Vimeo, Dailymotion, Rumble, direct video files.
 *
 * @module @features/media/gallery/utils
 * @phase Phase 8A - Gallery Display Standardization
 */

import type { VideoProvider } from '../types/gallery-types';

export interface ParsedVideo {
  provider: VideoProvider;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  originalUrl: string;
}

/**
 * Parse video URL and extract embed information for supported providers.
 *
 * NOTE: Embed URLs do NOT include autoplay params. Rumble embeds break with
 * ?autoplay=1 and other providers behave inconsistently. The component layer
 * handles play-on-click via thumbnail overlay → iframe swap instead.
 *
 * Rumble watch-page URLs (rumble.com/v76n7py-title.html) cannot be embedded
 * directly — they need server-side resolution via /api/video/resolve.
 * These return embedUrl: null so consumers can detect and resolve them.
 *
 * @see src/features/dashboard/components/managers/VideoManager.tsx parsePreviewVideoUrl
 * @see src/features/listings/components/details/ListingVideoPlayer.tsx parseVideoUrl
 */
export function parseVideoUrl(url: string): ParsedVideo {
  if (!url) {
    return { provider: 'unknown', embedUrl: null, videoId: null, thumbnailUrl: null, originalUrl: url };
  }

  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch && youtubeMatch[1]) {
    const videoId = youtubeMatch[1];
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
      videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      originalUrl: url
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      videoId,
      thumbnailUrl: null, // Vimeo requires API call for thumbnail
      originalUrl: url
    };
  }

  // Dailymotion
  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch && dailymotionMatch[1]) {
    const videoId = dailymotionMatch[1];
    return {
      provider: 'dailymotion',
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`,
      videoId,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      originalUrl: url
    };
  }

  // Rumble embed URL: rumble.com/embed/v6rj3lf/ — works as iframe src
  const rumbleEmbedMatch = url.match(/rumble\.com\/embed\/(v[a-zA-Z0-9]+)/);
  if (rumbleEmbedMatch && rumbleEmbedMatch[1]) {
    const videoId = rumbleEmbedMatch[1];
    return {
      provider: 'rumble',
      embedUrl: `https://rumble.com/embed/${videoId}/`,
      videoId,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  // Rumble watch page URL: rumble.com/v76n7py-title.html
  // Watch page IDs differ from embed IDs — needs server-side resolution
  const rumbleWatchMatch = url.match(/rumble\.com\/(v[a-zA-Z0-9]+-[^?/]+)/);
  if (rumbleWatchMatch) {
    return {
      provider: 'rumble',
      embedUrl: null,
      videoId: null,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  // TikTok: @user/video/ID format
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/);
  if (tiktokMatch && tiktokMatch[1]) {
    const videoId = tiktokMatch[1];
    return {
      provider: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      videoId,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  // TikTok short URLs (vm.tiktok.com) — needs server-side resolution
  if (url.match(/vm\.tiktok\.com\//)) {
    return {
      provider: 'tiktok',
      embedUrl: null,
      videoId: null,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  // Direct video file
  const directVideoMatch = url.match(/\.(mp4|webm|mov)$/i);
  if (directVideoMatch) {
    return {
      provider: 'direct',
      embedUrl: url,
      videoId: null,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  return {
    provider: 'unknown',
    embedUrl: null,
    videoId: null,
    thumbnailUrl: null,
    originalUrl: url
  };
}
