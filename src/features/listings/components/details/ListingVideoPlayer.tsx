/**
 * ListingVideoPlayer - Video Display Component
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Gallery & Media
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - YouTube, Vimeo, Dailymotion embed support
 * - Direct video file playback (.mp4, .webm, .mov)
 * - Responsive 16:9 aspect ratio
 * - Thumbnail preview before playback
 * - Loading state
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Play, Video, ExternalLink, Settings } from 'lucide-react';
import Image from 'next/image';
import type { Listing } from '@core/services/ListingService';

interface ListingVideoPlayerProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

type VideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'rumble' | 'rumble-watch' | 'tiktok' | 'direct' | 'unknown';

interface ParsedVideo {
  provider: VideoProvider;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  originalUrl: string;
}

/**
 * Parse video URL and extract embed information
 */
function parseVideoUrl(url: string): ParsedVideo {
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

  // Rumble embed URL: rumble.com/embed/v6rj3lf/ → works as iframe src
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
  // Watch page IDs are different from embed IDs — can't be used for iframe embed
  const rumbleWatchMatch = url.match(/rumble\.com\/(v[a-zA-Z0-9]+-[^?/]+)/);
  if (rumbleWatchMatch) {
    return {
      provider: 'rumble-watch',
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

  // TikTok short URLs (vm.tiktok.com) — can't resolve client-side
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

export function ListingVideoPlayer({ listing, isEditMode }: ListingVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Parse video URL
  const video = useMemo(() => {
    if (!listing.video_url) return null;
    return parseVideoUrl(listing.video_url);
  }, [listing.video_url]);

  // For URLs that can't be embedded client-side (rumble-watch, tiktok short),
  // resolve server-side to get embeddable URL
  const needsResolution = video && (video.provider === 'rumble-watch' || (video.provider === 'tiktok' && !video.embedUrl));

  useEffect(() => {
    if (!needsResolution || !video) return;
    setIsResolving(true);
    fetch('/api/video/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: video.originalUrl }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.changed && data.data.resolvedUrl) {
          setResolvedEmbedUrl(data.data.resolvedUrl);
        }
      })
      .catch(() => { /* resolution failed, show fallback */ })
      .finally(() => setIsResolving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsResolution, video?.originalUrl]);

  // Use resolved URL to build effective embed URL
  const effectiveVideo = useMemo(() => {
    if (!video) return null;
    if (!resolvedEmbedUrl) return video;

    // Re-parse the resolved URL to get proper embed URL
    const resolved = parseVideoUrl(resolvedEmbedUrl);
    if (resolved.embedUrl) {
      return { ...resolved, originalUrl: video.originalUrl };
    }
    return video;
  }, [video, resolvedEmbedUrl]);

  const hasVideo = effectiveVideo && effectiveVideo.provider !== 'unknown';

  // Show empty state in edit mode when no video
  if (isEditMode && !hasVideo) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Video className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Video
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No video yet. Add a YouTube, Vimeo, or direct video link.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/media` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no video
  if (!hasVideo) {
    return null;
  }

  const providerLabel = effectiveVideo.provider === 'youtube' ? 'YouTube' : effectiveVideo.provider === 'vimeo' ? 'Vimeo' : effectiveVideo.provider === 'rumble' ? 'Rumble' : effectiveVideo.provider === 'rumble-watch' ? 'Rumble' : effectiveVideo.provider === 'tiktok' ? 'TikTok' : effectiveVideo.provider === 'dailymotion' ? 'Dailymotion' : effectiveVideo.provider;

  // Show loading spinner while resolving URL server-side
  if (isResolving) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-biz-orange" />
          Video
        </h2>
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        </div>
      </section>
    );
  }

  // Last-resort fallback: if resolution failed and there's no embed URL,
  // show a link to the original platform
  if (!effectiveVideo.embedUrl) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-biz-orange" />
          Video
        </h2>
        <div className="bg-gray-900 rounded-lg p-8 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
          <a
            href={effectiveVideo.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-biz-orange text-white font-medium rounded-lg hover:bg-biz-orange/90 transition-colors flex items-center gap-2"
          >
            Watch on {providerLabel}
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-gray-400 text-xs text-center">
            Could not load inline player. Try re-saving the video URL from the dashboard.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
        <Video className="w-5 h-5 text-biz-orange" />
        Video
      </h2>

      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {/* Thumbnail Preview (before play) */}
        {!isPlaying && effectiveVideo.thumbnailUrl && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-inset"
            aria-label="Play video"
          >
            <Image
              src={effectiveVideo.thumbnailUrl}
              alt={`${listing.name} video thumbnail`}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 md:w-10 md:h-10 text-biz-orange ml-1" />
              </div>
            </div>
          </button>
        )}

        {/* Direct Video Element */}
        {effectiveVideo.provider === 'direct' && (
          <video
            src={effectiveVideo.embedUrl!}
            controls
            className="w-full h-full"
            poster={effectiveVideo.thumbnailUrl || undefined}
          >
            <p className="text-gray-500">Your browser does not support video playback.</p>
          </video>
        )}

        {/* Embedded Video (YouTube, Vimeo, Dailymotion, Rumble, TikTok) */}
        {effectiveVideo.provider !== 'direct' && (isPlaying || !effectiveVideo.thumbnailUrl) && effectiveVideo.embedUrl && (
          <iframe
            src={effectiveVideo.embedUrl}
            title={`${listing.name} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      {/* Small "Watch on platform" tag */}
      <div className="mt-3 flex justify-end">
        <a
          href={effectiveVideo.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-biz-orange flex items-center gap-1 transition-colors"
        >
          Watch on {providerLabel}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </section>
  );
}

export default ListingVideoPlayer;
