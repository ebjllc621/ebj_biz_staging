/**
 * ListingVideoGallery - Tier-Limited Video Gallery Display
 *
 * @deprecated Phase 8B - Video gallery is now unified into ListingGallery.
 * This component is preserved for backward compatibility only.
 * Use ListingGallery which renders both images and videos via GalleryDisplay.
 * @see src/features/listings/components/details/ListingGallery.tsx
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase B - Video Gallery Feature
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Tier-limited video counts (essentials: 1, plus: 10, preferred: 50, premium: 50)
 * - YouTube, Vimeo, Dailymotion thumbnail extraction
 * - Click to play in modal
 * - Grid display with video count badge
 * - Edit mode empty state with tier upgrade prompt
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/MASTER_INDEX_BRAIN_PLAN.md
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, Play, Settings, Lock, ExternalLink, X } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ListingVideoGalleryProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
  /** Callback for tier upgrade */
  onUpgradeClick?: () => void;
}

type VideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'rumble' | 'direct' | 'unknown';

interface ParsedVideo {
  provider: VideoProvider;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  originalUrl: string;
}

/**
 * Tier-based video limits
 */
const VIDEO_LIMITS: Record<Listing['tier'], number> = {
  essentials: 1,
  plus: 10,
  preferred: 50,
  premium: 50
};

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
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`,
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
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
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
      embedUrl: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`,
      videoId,
      thumbnailUrl: `https://www.dailymotion.com/thumbnail/video/${videoId}`,
      originalUrl: url
    };
  }

  // Rumble
  // Supports: rumble.com/v1abc123-title.html, rumble.com/embed/v1abc123/
  const rumbleMatch = url.match(/rumble\.com\/(?:embed\/)?(v[a-zA-Z0-9]+)/);
  if (rumbleMatch && rumbleMatch[1]) {
    const videoId = rumbleMatch[1];
    return {
      provider: 'rumble',
      embedUrl: `https://rumble.com/embed/${videoId}/?autoplay=1`,
      videoId,
      thumbnailUrl: null, // Rumble doesn't provide public thumbnail URLs
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

export function ListingVideoGallery({ listing, isEditMode, onUpgradeClick }: ListingVideoGalleryProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);

  // Get tier limit
  const tierLimit = VIDEO_LIMITS[listing.tier || 'essentials'];

  // Parse all video URLs
  const videos = useMemo(() => {
    const videoUrls = listing.video_gallery || [];
    return videoUrls
      .slice(0, tierLimit) // Enforce tier limit
      .map(url => parseVideoUrl(url))
      .filter(v => v.provider !== 'unknown');
  }, [listing.video_gallery, tierLimit]);

  const hasVideos = videos.length > 0;
  const totalVideos = listing.video_gallery?.length || 0;
  const isAtLimit = totalVideos >= tierLimit;

  // Show empty state in edit mode when no videos
  if (isEditMode && !hasVideos) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Film className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Video Gallery
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No videos yet. Add up to {tierLimit} video{tierLimit > 1 ? 's' : ''} to your gallery.
              {tierLimit < 50 && (
                <span className="block mt-1 text-biz-orange">
                  Upgrade your tier for more videos.
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Link
                href={`/dashboard/listings/${String(listing.id)}/video-gallery` as '/dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configure
              </Link>
              {tierLimit < 50 && onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-biz-orange text-biz-orange text-sm font-medium rounded-md hover:bg-biz-orange/10 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no videos
  if (!hasVideos) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
        <Film className="w-5 h-5 text-biz-orange" />
        Video Gallery
        <span className="text-sm font-normal text-gray-500">
          ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
        </span>
      </h2>

      {/* Tier limit indicator in edit mode */}
      {isEditMode && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {videos.length} / {tierLimit} videos used
          </span>
          {isAtLimit && tierLimit < 50 && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="text-biz-orange hover:underline flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              Upgrade for more
            </button>
          )}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video, index) => (
          <button
            key={`video-${index}`}
            onClick={() => setActiveVideoIndex(index)}
            className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2"
            aria-label={`Play video ${index + 1}`}
          >
            {/* Thumbnail */}
            {video.thumbnailUrl ? (
              <Image
                src={video.thumbnailUrl}
                alt={`${listing.name} video ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <Film className="w-8 h-8 text-gray-600" />
              </div>
            )}

            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-biz-orange ml-0.5" />
              </div>
            </div>

            {/* Provider Badge */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize">
              {video.provider}
            </div>
          </button>
        ))}
      </div>

      {/* Video Modal */}
      {activeVideoIndex !== null && videos[activeVideoIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideoIndex(null)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveVideoIndex(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Video Player */}
            {videos[activeVideoIndex].provider === 'direct' ? (
              <video
                src={videos[activeVideoIndex].embedUrl || ''}
                controls
                autoPlay
                className="w-full h-full"
              >
                <p className="text-white">Your browser does not support video playback.</p>
              </video>
            ) : (
              <iframe
                src={videos[activeVideoIndex].embedUrl || ''}
                title={`${listing.name} video ${activeVideoIndex + 1}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            )}
          </div>

          {/* External Link */}
          <a
            href={videos[activeVideoIndex].originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 hover:text-white flex items-center gap-1 text-sm"
          >
            Open original
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </section>
  );
}

export default ListingVideoGallery;
