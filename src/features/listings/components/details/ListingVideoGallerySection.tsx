/**
 * ListingVideoGallerySection - Separate Video Gallery Display
 *
 * @description Displays videos in their own dedicated section on the listing details page.
 *   Uses when combine_video_gallery is false (default). When combine_video_gallery is true,
 *   ListingGallery handles video display via MediaTypeFilter tabs instead.
 *   Each video renders as an inline player (iframe/video element) matching the
 *   ListingVideoPlayer pattern from the description page.
 * @component Client Component
 * @tier STANDARD
 * @phase Video Gallery Manager
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_VIDEO_GALLERY_BRAIN_PLAN.md
 */
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Film, Settings, Play, ExternalLink, Video } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { parseVideoUrl } from '@features/media/gallery';
import type { ParsedVideo } from '@features/media/gallery';
import type { VideoGalleryLayout } from '@features/media/gallery';

interface ListingVideoGallerySectionProps {
  listing: Listing;
  isEditMode?: boolean;
}

// ─── Provider label helper (matches ListingVideoPlayer) ─────────────────────

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'dailymotion': return 'Dailymotion';
    case 'rumble': return 'Rumble';
    case 'rumble-watch': return 'Rumble';
    case 'tiktok': return 'TikTok';
    default: return 'source';
  }
}

// ─── Inline Video Player (replicates ListingVideoPlayer pattern) ────────────

interface InlineVideoPlayerProps {
  videoUrl: string;
  listingName: string;
  index: number;
  resolvedEmbedUrl?: string;
}

function InlineVideoPlayer({ videoUrl, listingName, index, resolvedEmbedUrl }: InlineVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [localResolvedUrl, setLocalResolvedUrl] = useState<string | null>(resolvedEmbedUrl ?? null);

  const video = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);

  // Server-side resolution for Rumble watch URLs, TikTok short URLs
  const needsResolution = !resolvedEmbedUrl && video.provider !== 'unknown' && !video.embedUrl;

  useEffect(() => {
    if (!needsResolution) return;
    setIsResolving(true);
    fetch('/api/video/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: video.originalUrl }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.changed && data.data.resolvedUrl) {
          const reParsed = parseVideoUrl(data.data.resolvedUrl);
          if (reParsed.embedUrl) {
            setLocalResolvedUrl(reParsed.embedUrl);
          }
        }
      })
      .catch(() => { /* fallback to link card */ })
      .finally(() => setIsResolving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsResolution, video.originalUrl]);

  // Build effective video using resolved URL if available
  const effectiveVideo: ParsedVideo = useMemo(() => {
    const effectiveEmbedUrl = video.embedUrl ?? localResolvedUrl ?? resolvedEmbedUrl ?? null;
    if (effectiveEmbedUrl && effectiveEmbedUrl !== video.embedUrl) {
      const resolved = parseVideoUrl(effectiveEmbedUrl);
      if (resolved.embedUrl) {
        return { ...resolved, originalUrl: video.originalUrl };
      }
    }
    if (effectiveEmbedUrl && !video.embedUrl) {
      return { ...video, embedUrl: effectiveEmbedUrl };
    }
    return video;
  }, [video, localResolvedUrl, resolvedEmbedUrl]);

  const providerLabel = getProviderLabel(effectiveVideo.provider);

  // Loading spinner while resolving
  if (isResolving) {
    return (
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  // Fallback: no embed URL — show link to original platform
  if (!effectiveVideo.embedUrl) {
    return (
      <div>
        <div className="bg-gray-900 rounded-lg p-8 flex flex-col items-center justify-center gap-4 aspect-video">
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
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {/* Thumbnail Preview (before play) */}
        {!isPlaying && effectiveVideo.thumbnailUrl && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-inset z-10"
            aria-label={`Play ${listingName} video ${index + 1}`}
          >
            <Image
              src={effectiveVideo.thumbnailUrl}
              alt={`${listingName} video ${index + 1} thumbnail`}
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
          >
            <p className="text-gray-500">Your browser does not support video playback.</p>
          </video>
        )}

        {/* Embedded Video (YouTube, Vimeo, Dailymotion, Rumble, TikTok) */}
        {effectiveVideo.provider !== 'direct' && (isPlaying || !effectiveVideo.thumbnailUrl) && effectiveVideo.embedUrl && (
          <iframe
            src={effectiveVideo.embedUrl}
            title={`${listingName} video ${index + 1}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      {/* "Watch on platform" link */}
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
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ListingVideoGallerySection({ listing, isEditMode }: ListingVideoGallerySectionProps) {
  // Track resolved embed URLs for providers that need server-side resolution
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());

  const rawVideos = useMemo(
    () => (listing.video_gallery || []) as string[],
    [listing.video_gallery]
  );

  // Batch-resolve URLs that need server-side resolution (Rumble watch, TikTok short)
  useEffect(() => {
    const toResolve: string[] = [];
    for (const videoUrl of rawVideos) {
      const parsed = parseVideoUrl(videoUrl);
      if (parsed.provider !== 'unknown' && !parsed.embedUrl) {
        toResolve.push(videoUrl);
      }
    }
    if (toResolve.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = new Map<string, string>();
      for (const url of toResolve) {
        try {
          const res = await fetch('/api/video/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const data = await res.json();
          if (data.success && data.data?.changed && data.data.resolvedUrl) {
            const reParsed = parseVideoUrl(data.data.resolvedUrl);
            if (reParsed.embedUrl) {
              results.set(url, reParsed.embedUrl);
            }
          }
        } catch {
          // Resolution failed — video will show fallback card
        }
      }
      if (!cancelled && results.size > 0) {
        setResolvedUrls(results);
      }
    })();
    return () => { cancelled = true; };
  }, [rawVideos]);

  const hasVideos = rawVideos.length > 0;

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
              No videos yet. Add videos to showcase your business.
            </p>
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={`/dashboard/listings/${String(listing.id)}/video-gallery` as any}
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

  // Return null in published mode when no videos
  if (!hasVideos) {
    return null;
  }

  const layout = (listing.video_gallery_layout as VideoGalleryLayout) ?? 'inline';

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
        <Video className="w-5 h-5 text-biz-orange" />
        Video Gallery
        <span className="text-sm font-normal text-gray-500">
          ({rawVideos.length} {rawVideos.length === 1 ? 'video' : 'videos'})
        </span>
      </h2>

      <VideoGalleryLayoutRenderer
        layout={layout}
        videos={rawVideos}
        listingName={listing.name}
        resolvedUrls={resolvedUrls}
      />
    </section>
  );
}

// ─── Layout Renderer ────────────────────────────────────────────────────────

interface VideoGalleryLayoutRendererProps {
  layout: VideoGalleryLayout;
  videos: string[];
  listingName: string;
  resolvedUrls: Map<string, string>;
}

function VideoGalleryLayoutRenderer({ layout, videos, listingName, resolvedUrls }: VideoGalleryLayoutRendererProps) {
  if (videos.length === 0) return null;

  const renderPlayer = (videoUrl: string, index: number) => (
    <InlineVideoPlayer
      key={videoUrl}
      videoUrl={videoUrl}
      listingName={listingName}
      index={index}
      resolvedEmbedUrl={resolvedUrls.get(videoUrl)}
    />
  );

  // Carousel: one video at a time with navigation
  if (layout === 'carousel') {
    return (
      <VideoGalleryCarousel
        videos={videos}
        listingName={listingName}
        resolvedUrls={resolvedUrls}
      />
    );
  }

  // Showcase: featured video with thumbnail strip
  if (layout === 'showcase') {
    return (
      <VideoGalleryShowcase
        videos={videos}
        listingName={listingName}
        resolvedUrls={resolvedUrls}
      />
    );
  }

  // Grid: 2-column responsive grid
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((url, i) => renderPlayer(url, i))}
      </div>
    );
  }

  // Masonry: 2-column staggered
  if (layout === 'masonry') {
    const col1 = videos.filter((_, i) => i % 2 === 0);
    const col2 = videos.filter((_, i) => i % 2 === 1);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {col1.map((url) => renderPlayer(url, videos.indexOf(url)))}
        </div>
        <div className="space-y-6">
          {col2.map((url) => renderPlayer(url, videos.indexOf(url)))}
        </div>
      </div>
    );
  }

  // Inline (default): single column, full-width stacked
  return (
    <div className="space-y-6">
      {videos.map((url, i) => renderPlayer(url, i))}
    </div>
  );
}

// ─── Carousel Component ─────────────────────────────────────────────────────

function VideoGalleryCarousel({
  videos,
  listingName,
  resolvedUrls,
}: {
  videos: string[];
  listingName: string;
  resolvedUrls: Map<string, string>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  }, [videos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  }, [videos.length]);

  return (
    <div className="relative">
      <InlineVideoPlayer
        videoUrl={videos[currentIndex]!}
        listingName={listingName}
        index={currentIndex}
        resolvedEmbedUrl={resolvedUrls.get(videos[currentIndex]!)}
      />

      {videos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20"
            aria-label="Previous video"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20"
            aria-label="Next video"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="flex justify-center gap-2 mt-4">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-biz-orange' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to video ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Showcase Component ──────────────────────────────────────────────────────

function VideoGalleryShowcase({
  videos,
  listingName,
  resolvedUrls,
}: {
  videos: string[];
  listingName: string;
  resolvedUrls: Map<string, string>;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="space-y-4">
      {/* Featured video */}
      <InlineVideoPlayer
        videoUrl={videos[selectedIndex]!}
        listingName={listingName}
        index={selectedIndex}
        resolvedEmbedUrl={resolvedUrls.get(videos[selectedIndex]!)}
      />

      {/* Thumbnail strip */}
      {videos.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {videos.map((videoUrl, i) => {
            const parsed = parseVideoUrl(videoUrl);
            const isActive = i === selectedIndex;
            return (
              <button
                key={videoUrl}
                onClick={() => setSelectedIndex(i)}
                className={`relative flex-shrink-0 w-28 h-16 md:w-36 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-biz-orange ring-1 ring-biz-orange'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                aria-label={`Select video ${i + 1}`}
              >
                {/* Thumbnail rendering — replicates SortableVideoCard fallback pattern */}
                {parsed.thumbnailUrl ? (
                  <Image
                    src={parsed.thumbnailUrl}
                    alt={`${listingName} video ${i + 1} thumbnail`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (parsed.embedUrl ?? resolvedUrls.get(videoUrl)) && parsed.provider !== 'direct' ? (
                  <iframe
                    src={parsed.embedUrl ?? resolvedUrls.get(videoUrl)!}
                    title={`${listingName} video ${i + 1}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                ) : (parsed.embedUrl ?? resolvedUrls.get(videoUrl)) && parsed.provider === 'direct' ? (
                  <video
                    src={parsed.embedUrl ?? resolvedUrls.get(videoUrl)!}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <p>Preview unavailable</p>
                  </video>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/70" />
                  </div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-biz-orange/20" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ListingVideoGallerySection;
