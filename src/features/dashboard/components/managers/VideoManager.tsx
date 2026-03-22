'use client';

/**
 * VideoManager - Video Gallery Management
 *
 * @description Manage video gallery with upload, URL paste, delete, reorder,
 *   multi-select batch operations, context menu, SEO editing, and layout preferences.
 *   Includes "Combine with Image Gallery" toggle for controlling listing page display.
 * @component Client Component
 * @tier ADVANCED
 * @phase Video Gallery Manager
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_VIDEO_GALLERY_BRAIN_PLAN.md
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, Eye, EyeOff, Film, Play, ExternalLink, Video } from 'lucide-react';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { VideoGrid } from './video-gallery/VideoGrid';
import { VideoLayoutSelector } from './video-gallery/VideoLayoutSelector';
import VideoAddModal from './video-gallery/VideoAddModal';
import VideoSEOEditModal from './video-gallery/VideoSEOEditModal';
import { parseVideoUrl } from '@features/media/gallery';
import type { VideoGalleryLayout } from '@features/media/gallery';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';
import BizModal from '@/components/BizModal/BizModal';
import type { VideoSEOItem } from './video-gallery/VideoSEOEditModal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIDEO_GALLERY_LIMITS: Record<string, number> = {
  essentials: 1,
  plus: 10,
  preferred: 50,
  premium: 50,
};

// ---------------------------------------------------------------------------
// Video URL parsing (replicated from DescriptionManager — NO autoplay params)
// ---------------------------------------------------------------------------

type PreviewVideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'rumble' | 'rumble-watch' | 'tiktok' | 'direct' | 'unknown';

interface PreviewParsedVideo {
  provider: PreviewVideoProvider;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  originalUrl: string;
}

function parsePreviewVideoUrl(url: string): PreviewParsedVideo {
  if (!url) {
    return { provider: 'unknown', embedUrl: null, videoId: null, thumbnailUrl: null, originalUrl: url };
  }

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

  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      provider: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      videoId,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

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

  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/);
  const tiktokShortMatch = !tiktokMatch ? url.match(/vm\.tiktok\.com\/([a-zA-Z0-9]+)/) : null;
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
  if (tiktokShortMatch) {
    return {
      provider: 'tiktok',
      embedUrl: null,
      videoId: null,
      thumbnailUrl: null,
      originalUrl: url
    };
  }

  const directVideoMatch = url.match(/\.(mp4|webm|mov)$/i);
  if (directVideoMatch) {
    return { provider: 'direct', embedUrl: url, videoId: null, thumbnailUrl: null, originalUrl: url };
  }

  return { provider: 'unknown', embedUrl: null, videoId: null, thumbnailUrl: null, originalUrl: url };
}

// ---------------------------------------------------------------------------
// VideoPreview (exact replication of DescriptionManager VideoPreview)
// ---------------------------------------------------------------------------

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

function VideoPreviewInline({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const video = useMemo(() => parsePreviewVideoUrl(url), [url]);

  // For URLs that need server-side resolution (Rumble watch, TikTok short)
  const needsResolution = video.provider === 'rumble-watch' || (video.provider === 'tiktok' && !video.embedUrl);

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
          setResolvedEmbedUrl(data.data.resolvedUrl);
        }
      })
      .catch(() => { /* fallback to link card */ })
      .finally(() => setIsResolving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsResolution, video.originalUrl]);

  // Build effective video using resolved URL if available
  const effectiveVideo = useMemo(() => {
    if (!resolvedEmbedUrl) return video;
    const resolved = parsePreviewVideoUrl(resolvedEmbedUrl);
    if (resolved.embedUrl) {
      return { ...resolved, originalUrl: video.originalUrl };
    }
    return video;
  }, [video, resolvedEmbedUrl]);

  if (effectiveVideo.provider === 'unknown') {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
        Unrecognized video URL format. Supported: YouTube, Vimeo, Dailymotion, Rumble, TikTok, or direct .mp4/.webm/.mov
      </div>
    );
  }

  // Show loading spinner while resolving
  if (isResolving) {
    return (
      <div className="mt-3">
        <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </div>
    );
  }

  // Last-resort fallback if no embed URL after resolution attempt
  if (!effectiveVideo.embedUrl) {
    return (
      <div className="mt-3">
        <div className="bg-gray-900 rounded-lg p-6 flex flex-col items-center justify-center gap-3 aspect-video">
          <Video className="w-10 h-10 text-gray-400" />
          <a
            href={effectiveVideo.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Watch on {getProviderLabel(effectiveVideo.provider)}
          </a>
          <p className="text-gray-400 text-xs text-center">
            Could not load inline player. Try re-saving the URL to resolve it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        {/* Thumbnail preview before play */}
        {!isPlaying && effectiveVideo.thumbnailUrl && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset z-10"
            aria-label="Play video preview"
          >
            <Image
              src={effectiveVideo.thumbnailUrl}
              alt="Video thumbnail"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-blue-600 ml-0.5" />
              </div>
            </div>
          </button>
        )}

        {/* Direct video element */}
        {effectiveVideo.provider === 'direct' && (
          <video src={effectiveVideo.embedUrl!} controls className="w-full h-full">
            <p>Your browser does not support video playback.</p>
          </video>
        )}

        {/* Embedded video (YouTube, Vimeo, Dailymotion, Rumble, TikTok) */}
        {effectiveVideo.provider !== 'direct' && (isPlaying || !effectiveVideo.thumbnailUrl) && effectiveVideo.embedUrl && (
          <iframe
            src={effectiveVideo.embedUrl}
            title="Video preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <a
          href={effectiveVideo.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          Watch on {getProviderLabel(effectiveVideo.provider)}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout renderer — renders video previews according to chosen layout
// ---------------------------------------------------------------------------

function VideoLayoutRenderer({ layout, videos, resolvedUrls }: { layout: VideoGalleryLayout; videos: string[]; resolvedUrls?: Map<string, string> }) {
  if (videos.length === 0) return null;

  // Carousel: one video at a time with prev/next
  if (layout === 'carousel') {
    return <VideoCarouselLayout videos={videos} resolvedUrls={resolvedUrls} />;
  }

  // Showcase: featured video + thumbnail strip
  if (layout === 'showcase') {
    return <VideoShowcaseLayout videos={videos} resolvedUrls={resolvedUrls} />;
  }

  // Grid: 2-column grid (sm breakpoint for dashboard panel width)
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((url) => (
          <VideoPreviewInline key={url} url={url} />
        ))}
      </div>
    );
  }

  // Masonry: 2-column staggered
  if (layout === 'masonry') {
    const col1 = videos.filter((_, i) => i % 2 === 0);
    const col2 = videos.filter((_, i) => i % 2 === 1);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          {col1.map((url) => (
            <VideoPreviewInline key={url} url={url} />
          ))}
        </div>
        <div className="space-y-4">
          {col2.map((url) => (
            <VideoPreviewInline key={url} url={url} />
          ))}
        </div>
      </div>
    );
  }

  // Inline (default): single column, full-width stacked
  return (
    <div className="space-y-4">
      {videos.map((url) => (
        <VideoPreviewInline key={url} url={url} />
      ))}
    </div>
  );
}

function VideoCarouselLayout({ videos, resolvedUrls: _resolvedUrls }: { videos: string[]; resolvedUrls?: Map<string, string> }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  }, [videos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === videos.length - 1 ? 0 : prev + 1));
  }, [videos.length]);

  return (
    <div className="relative">
      <VideoPreviewInline url={videos[currentIndex]!} />

      {videos.length > 1 && (
        <>
          {/* Navigation buttons */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20"
            aria-label="Previous video"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-20"
            aria-label="Next video"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-3">
            {videos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-[#ed6437]' : 'bg-gray-300 hover:bg-gray-400'
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

function VideoShowcaseLayout({ videos, resolvedUrls }: { videos: string[]; resolvedUrls?: Map<string, string> }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      {/* Featured video */}
      <VideoPreviewInline url={videos[selectedIndex]!} />

      {/* Thumbnail strip */}
      {videos.length > 1 && (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300"
        >
          {videos.map((url, i) => {
            const parsed = parsePreviewVideoUrl(url);
            const isActive = i === selectedIndex;
            return (
              <button
                key={url}
                onClick={() => setSelectedIndex(i)}
                className={`relative flex-shrink-0 w-24 h-14 rounded-md overflow-hidden border-2 transition-all ${
                  isActive
                    ? 'border-[#ed6437] ring-1 ring-[#ed6437]'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                aria-label={`Select video ${i + 1}`}
              >
                {/* Thumbnail rendering — replicates SortableVideoCard fallback pattern */}
                {parsed.thumbnailUrl ? (
                  <Image
                    src={parsed.thumbnailUrl}
                    alt={`Video ${i + 1} thumbnail`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (parsed.embedUrl ?? resolvedUrls?.get(url)) && parsed.provider !== 'direct' ? (
                  <iframe
                    src={(parsed.embedUrl ?? resolvedUrls?.get(url))!}
                    title={`Video ${i + 1}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                ) : (parsed.embedUrl ?? resolvedUrls?.get(url)) && parsed.provider === 'direct' ? (
                  <video
                    src={(parsed.embedUrl ?? resolvedUrls?.get(url))!}
                    className="w-full h-full object-cover pointer-events-none"
                    muted
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <p>Preview unavailable</p>
                  </video>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white/70" />
                  </div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-[#ed6437]/20" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content component
// ---------------------------------------------------------------------------

function VideoManagerContent() {
  const { selectedListingId, selectedListing } = useListingContext();
  const listingId = selectedListingId;
  const tier = selectedListing?.tier ?? 'essentials';
  const { listing, refreshListing } = useListingData(listingId);
  const { updateListing } = useListingUpdate(listingId);
  const { layout: sectionLayout, updateLayout } = useListingSectionLayout({ listingId: listingId ?? 0 });

  // Layout state
  const [activeLayout, setActiveLayout] = useState<VideoGalleryLayout>(
    (listing?.video_gallery_layout as VideoGalleryLayout) || 'grid'
  );

  useEffect(() => {
    if (listing?.video_gallery_layout) {
      setActiveLayout(listing.video_gallery_layout as VideoGalleryLayout);
    }
  }, [listing?.video_gallery_layout]);

  // Modal / UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingVideoUrl, setDeletingVideoUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSEOModal, setShowSEOModal] = useState(false);
  const [seoEditUrls, setSeoEditUrls] = useState<string[]>([]);
  const [isSavingSEO, setIsSavingSEO] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<
    Map<string, { altText?: string; titleText?: string }>
  >(new Map());
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [isTogglingCombine, setIsTogglingCombine] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const videos: string[] = useMemo(
    () => (listing?.video_gallery as string[] | undefined) ?? [],
    [listing?.video_gallery]
  );

  // Resolve URLs that need server-side resolution (Rumble watch, TikTok short)
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());

  const parsedVideos = useMemo(() => {
    const map = new Map<
      string,
      { thumbnailUrl: string | null; provider: string; embedUrl: string | null }
    >();
    for (const url of videos) {
      const parsed = parseVideoUrl(url);
      // Use parsePreviewVideoUrl for embed URLs (no autoplay — works with Rumble)
      const preview = parsePreviewVideoUrl(url);
      map.set(url, {
        thumbnailUrl: parsed.thumbnailUrl,
        provider: parsed.provider,
        embedUrl: preview.embedUrl ?? resolvedUrls.get(url) ?? null,
      });
    }
    return map;
  }, [videos, resolvedUrls]);

  useEffect(() => {
    const toResolve: string[] = [];
    for (const url of videos) {
      const preview = parsePreviewVideoUrl(url);
      if (preview.provider !== 'unknown' && !preview.embedUrl) {
        toResolve.push(url);
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
          // Non-critical — video will show as non-playable card
        }
      }
      if (!cancelled && results.size > 0) {
        setResolvedUrls(results);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  const isVideoGalleryVisible = useMemo(() => {
    if (!sectionLayout?.sections) return true;
    for (const section of sectionLayout.sections) {
      const feature = section.features?.find((f) => f.id === 'video-gallery');
      if (feature) return feature.visible;
    }
    return true;
  }, [sectionLayout]);

  const isCombinedWithGallery = Boolean(listing?.combine_video_gallery);

  const tierLimit = VIDEO_GALLERY_LIMITS[tier] ?? 1;
  const videoCount = videos.length;
  const atLimit = videoCount >= tierLimit;

  // ---------------------------------------------------------------------------
  // Fetch video metadata (SEO data) from media API
  // ---------------------------------------------------------------------------

  const fetchVideoMetadata = useCallback(
    async (urls: string[]) => {
      if (!urls.length) return;
      try {
        const response = await fetchWithCsrf('/api/media/by-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls }),
        });
        if (!response.ok) return;
        const data = await response.json();
        const items: Array<{
          url: string;
          altText?: string;
          titleText?: string;
        }> = data.items ?? [];
        setVideoMetadata((prev) => {
          const next = new Map(prev);
          for (const item of items) {
            next.set(item.url, {
              altText: item.altText,
              titleText: item.titleText,
            });
          }
          return next;
        });
      } catch {
        // Non-critical — metadata is optional
      }
    },
    []
  );

  useEffect(() => {
    if (videos.length) {
      fetchVideoMetadata(videos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.join(',')]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddVideos = useCallback(
    async (newUrls: string[]) => {
      setError(null);
      try {
        const merged = [...videos, ...newUrls];
        await updateListing({ video_gallery: merged });
        await refreshListing();
        setShowAddModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add videos');
      }
    },
    [videos, updateListing, refreshListing]
  );

  const handleDeleteVideo = useCallback(
    async (url: string) => {
      setIsDeleting(true);
      setError(null);
      try {
        const updated = videos.filter((v) => v !== url);
        await updateListing({ video_gallery: updated });
        await refreshListing();
        setDeletingVideoUrl(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete video');
      } finally {
        setIsDeleting(false);
      }
    },
    [videos, updateListing, refreshListing]
  );

  const handleDeleteBatch = useCallback(
    async (selectedUrls: string[]) => {
      setError(null);
      try {
        const selectedSet = new Set(selectedUrls);
        const updated = videos.filter((v) => !selectedSet.has(v));
        await updateListing({ video_gallery: updated });
        await refreshListing();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete videos'
        );
      }
    },
    [videos, updateListing, refreshListing]
  );

  const handleReorder = useCallback(
    async (reordered: string[]) => {
      setError(null);
      try {
        await updateListing({ video_gallery: reordered });
        await refreshListing();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to reorder videos'
        );
      }
    },
    [updateListing, refreshListing]
  );

  const handleEditSEO = useCallback((urls: string[]) => {
    setSeoEditUrls(urls);
    setShowSEOModal(true);
  }, []);

  const handleSaveSEO = useCallback(
    async (items: VideoSEOItem[]) => {
      setIsSavingSEO(true);
      setError(null);
      try {
        // Fetch existing media records by URL to get file IDs
        const response = await fetchWithCsrf('/api/media/by-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls: items.map((i) => i.url) }),
        });
        const data = response.ok ? await response.json() : { items: [] };
        const mediaItems: Array<{ url: string; id: number }> =
          data.items ?? [];

        const urlToId = new Map(mediaItems.map((m) => [m.url, m.id]));

        // Save SEO for each item that has a media record
        await Promise.all(
          items.map(async (item) => {
            const fileId = urlToId.get(item.url);
            if (!fileId) return;
            await fetchWithCsrf(`/api/media/${fileId}/seo`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                altText: item.altText,
                titleText: item.titleText,
              }),
            });
          })
        );

        // Update local metadata cache
        setVideoMetadata((prev) => {
          const next = new Map(prev);
          for (const item of items) {
            next.set(item.url, {
              altText: item.altText,
              titleText: item.titleText,
            });
          }
          return next;
        });

        setShowSEOModal(false);
        setSeoEditUrls([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save SEO');
      } finally {
        setIsSavingSEO(false);
      }
    },
    []
  );

  const handleToggleVisibility = useCallback(async () => {
    if (!sectionLayout) return;
    setIsTogglingVisibility(true);
    setError(null);
    try {
      const updatedSections = sectionLayout.sections.map((section) => ({
        ...section,
        features: section.features?.map((f) =>
          f.id === 'video-gallery' ? { ...f, visible: !isVideoGalleryVisible } : f
        )
      }));
      await updateLayout({ ...sectionLayout, sections: updatedSections });
      await refreshListing();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to toggle visibility'
      );
    } finally {
      setIsTogglingVisibility(false);
    }
  }, [
    isVideoGalleryVisible,
    sectionLayout,
    updateLayout,
    refreshListing,
  ]);

  const handleToggleCombine = useCallback(async () => {
    setIsTogglingCombine(true);
    setError(null);
    try {
      await updateListing({ combine_video_gallery: !isCombinedWithGallery });
      await refreshListing();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to toggle combine setting'
      );
    } finally {
      setIsTogglingCombine(false);
    }
  }, [
    isCombinedWithGallery,
    updateListing,
    refreshListing,
  ]);

  // ---------------------------------------------------------------------------
  // Player modal embed URL
  // ---------------------------------------------------------------------------

  const playingParsed = useMemo(() => {
    if (!playingVideoUrl) return null;
    return parseVideoUrl(playingVideoUrl);
  }, [playingVideoUrl]);

  // Use resolved URL for play modal if direct embed isn't available
  const playingEmbedUrl = playingParsed?.embedUrl
    ?? (playingVideoUrl ? resolvedUrls.get(playingVideoUrl) : null)
    ?? null;

  // ---------------------------------------------------------------------------
  // SEO items for modal
  // ---------------------------------------------------------------------------

  const seoItems: VideoSEOItem[] = useMemo(
    () =>
      seoEditUrls.map((url) => ({
        url,
        altText: videoMetadata.get(url)?.altText ?? '',
        titleText: videoMetadata.get(url)?.titleText ?? '',
        provider: parsedVideos.get(url)?.provider,
      })),
    [seoEditUrls, videoMetadata, parsedVideos]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!listing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#ed6437]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Video Gallery</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {videoCount} of {tierLimit} video{tierLimit !== 1 ? 's' : ''} used
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={atLimit}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-[#ed6437] text-white text-sm font-medium
            hover:bg-[#d4592f] transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <Plus className="w-4 h-4" />
          Add Video
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Show Video Gallery toggle                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isVideoGalleryVisible ? (
              <Eye className="w-5 h-5 text-[#ed6437]" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">
                Show Video Gallery on Listing Page
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isVideoGalleryVisible
                  ? 'Video gallery is visible to visitors'
                  : 'Video gallery is hidden from visitors'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleVisibility}
            disabled={isTogglingVisibility}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:ring-offset-2
              ${isVideoGalleryVisible ? 'bg-[#ed6437]' : 'bg-gray-200'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            role="switch"
            aria-checked={isVideoGalleryVisible}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${isVideoGalleryVisible ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
            {isTogglingVisibility && (
              <Loader2 className="absolute right-[-20px] w-3.5 h-3.5 animate-spin text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Combine with Image Gallery toggle                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Film
              className={`w-5 h-5 ${
                isCombinedWithGallery ? 'text-[#ed6437]' : 'text-gray-400'
              }`}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">
                Combine with Image Gallery
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCombinedWithGallery
                  ? 'Videos appear alongside images in the main gallery'
                  : 'Videos display in their own dedicated section on your listing page'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleCombine}
            disabled={isTogglingCombine}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:ring-offset-2
              ${isCombinedWithGallery ? 'bg-[#ed6437]' : 'bg-gray-200'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            role="switch"
            aria-checked={isCombinedWithGallery}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${isCombinedWithGallery ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
            {isTogglingCombine && (
              <Loader2 className="absolute right-[-20px] w-3.5 h-3.5 animate-spin text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Video gallery layout selector                                       */}
      {/* ------------------------------------------------------------------ */}
      {videos.length > 0 && (
        <VideoLayoutSelector
          listingId={selectedListingId!}
          currentLayout={activeLayout}
          onLayoutChange={async (layout) => {
            setActiveLayout(layout);
            await refreshListing();
          }}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Video preview (inline players matching listing detail page)          */}
      {/* ------------------------------------------------------------------ */}
      {videos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview</h3>
          <VideoLayoutRenderer layout={activeLayout} videos={videos} resolvedUrls={resolvedUrls} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tier limit banner                                                   */}
      {/* ------------------------------------------------------------------ */}
      <TierLimitBanner
        current={videoCount}
        limit={tierLimit}
        tier={tier}
        itemType="videos"
      />

      {/* ------------------------------------------------------------------ */}
      {/* Error display                                                       */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Manage Videos section                                               */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Manage Videos
        </h3>

        {videos.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No Videos Yet"
            description="Add videos to showcase your business"
            action={{
              label: 'Add Video',
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <VideoGrid
            videos={videos}
            parsedVideos={parsedVideos}
            videoMetadata={videoMetadata}
            onDelete={(url: string) => setDeletingVideoUrl(url)}
            onDeleteBatch={handleDeleteBatch}
            onReorder={handleReorder}
            onEditSEO={handleEditSEO}
            onPlayVideo={(url: string) => setPlayingVideoUrl(url)}
            isUpdating={false}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modals                                                              */}
      {/* ------------------------------------------------------------------ */}

      {/* Add videos */}
      {showAddModal && (
        <VideoAddModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddVideos}
          isSubmitting={false}
          maxVideos={tierLimit - videoCount}
          listingId={listingId ?? 0}
        />
      )}

      {/* Confirm delete */}
      {deletingVideoUrl && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingVideoUrl(null)}
          onConfirm={() => handleDeleteVideo(deletingVideoUrl)}
          itemType="video"
          isDeleting={isDeleting}
        />
      )}

      {/* SEO editor */}
      {showSEOModal && (
        <VideoSEOEditModal
          isOpen={true}
          onClose={() => {
            setShowSEOModal(false);
            setSeoEditUrls([]);
          }}
          videos={seoItems}
          onSave={handleSaveSEO}
          isSaving={isSavingSEO}
        />
      )}

      {/* Video player */}
      {playingVideoUrl && (playingEmbedUrl || playingParsed?.provider === 'direct') && (
        <BizModal
          isOpen={true}
          onClose={() => setPlayingVideoUrl(null)}
          title="Video Preview"
          maxWidth="lg"
        >
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            {playingParsed?.provider === 'direct' ? (
              <video
                src={playingVideoUrl}
                controls
                autoPlay
                className="w-full h-full"
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <iframe
                src={playingEmbedUrl!}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video preview"
              />
            )}
          </div>
        </BizModal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

function VideoManagerWithBoundary() {
  return (
    <ErrorBoundary componentName="VideoManager">
      <VideoManagerContent />
    </ErrorBoundary>
  );
}

export { VideoManagerWithBoundary as VideoManager };
export default VideoManagerWithBoundary;
