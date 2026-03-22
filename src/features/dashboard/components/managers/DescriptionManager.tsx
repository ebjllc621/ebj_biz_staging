/**
 * DescriptionManager - Manage Business Description, Video Embed & Audio Embed
 *
 * @description Edit rich text description with tier-based character limits,
 *   plus video and audio embed URL inputs (consolidated from separate pages).
 *   Embed boxes are above the description, share a row, and each has its own
 *   inline paste-and-save capability independent of the description edit flow.
 *   Each embed includes a preview player and visibility toggle synced with
 *   the listing page layout system.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * NOTE: Video embed is NOT related to the tier-gated Video Gallery feature.
 * It is a separate single embed URL available to all listings, displayed
 * in the listing details section alongside the description.
 */
'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Edit2, X, Check, AlertCircle, Loader2, Video, Music, Save, Eye, EyeOff, ExternalLink, Play } from 'lucide-react';
import Image from 'next/image';
// DOMPurify loaded dynamically client-side to avoid jsdom SSR issues
let _purify: typeof import('isomorphic-dompurify').default | null = null;
const getPurify = async () => {
  if (!_purify) {
    const mod = await import('isomorphic-dompurify');
    _purify = mod.default;
  }
  return _purify;
};
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { fetchWithCsrf } from '@core/utils/csrf';
import { useListingLayoutSync } from '@features/dashboard/hooks/useListingLayoutSync';
import { TIER_LIMITS } from '@features/listings/types/listing-form.types';
import { DescriptionEditor } from '@/components/editors/DescriptionEditor';
import type { FeatureId, ListingTier } from '@features/listings/types/listing-section-layout';

// ============================================================================
// VIDEO URL PARSING (replicated from ListingVideoPlayer)
// ============================================================================

type VideoProvider = 'youtube' | 'vimeo' | 'dailymotion' | 'rumble' | 'rumble-watch' | 'tiktok' | 'direct' | 'unknown';

interface ParsedVideo {
  provider: VideoProvider;
  embedUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  originalUrl: string;
}

function parseVideoUrl(url: string): ParsedVideo {
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

  // Rumble: embed URLs use a DIFFERENT ID than watch URLs
  // Embed URL: rumble.com/embed/v6rj3lf/ → works as iframe src
  // Watch URL: rumble.com/v76n7py-title.html → ID can't be used for embed
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

  // Rumble watch page URL — can't be embedded via iframe (different ID system)
  // Show link-based preview instead
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

  // TikTok: supports @user/video/ID and vm.tiktok.com/CODE
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
    // Short URLs can't be resolved client-side; show link fallback
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

// ============================================================================
// AUDIO URL PARSING (replicated from ListingAudioPlayer)
// ============================================================================

type AudioProvider = 'soundcloud' | 'spotify' | 'direct' | 'unknown';

interface ParsedAudio {
  provider: AudioProvider;
  embedUrl: string | null;
  trackId: string | null;
  originalUrl: string;
}

function parseAudioUrl(url: string): ParsedAudio {
  if (!url) {
    return { provider: 'unknown', embedUrl: null, trackId: null, originalUrl: url };
  }

  const soundcloudMatch = url.match(/soundcloud\.com\/([^/]+\/[^/]+(?:\/sets\/[^/]+)?)/);
  if (soundcloudMatch && soundcloudMatch[1]) {
    const encodedUrl = encodeURIComponent(url);
    return {
      provider: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      trackId: soundcloudMatch[1],
      originalUrl: url
    };
  }

  const spotifyMatch = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
    const type = spotifyMatch[1];
    const id = spotifyMatch[2];
    return {
      provider: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
      trackId: id,
      originalUrl: url
    };
  }

  const directAudioMatch = url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
  if (directAudioMatch) {
    return { provider: 'direct', embedUrl: url, trackId: null, originalUrl: url };
  }

  return { provider: 'unknown', embedUrl: null, trackId: null, originalUrl: url };
}

function getAudioEmbedHeight(provider: AudioProvider): number {
  switch (provider) {
    case 'soundcloud': return 166;
    case 'spotify': return 152;
    default: return 80;
  }
}

// ============================================================================
// VIDEO PREVIEW COMPONENT
// ============================================================================

function getProviderLabel(provider: VideoProvider): string {
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

function VideoPreview({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedEmbedUrl, setResolvedEmbedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const video = useMemo(() => parseVideoUrl(url), [url]);

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
    const resolved = parseVideoUrl(resolvedEmbedUrl);
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

// ============================================================================
// AUDIO PREVIEW COMPONENT
// ============================================================================

function AudioPreview({ url }: { url: string }) {
  const audio = useMemo(() => parseAudioUrl(url), [url]);

  if (audio.provider === 'unknown') {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
        Unrecognized audio URL format. Supported: SoundCloud, Spotify, or direct .mp3/.wav/.ogg/.m4a
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="rounded-lg overflow-hidden bg-gray-100">
        {audio.provider === 'soundcloud' && audio.embedUrl && (
          <iframe
            width="100%"
            height={getAudioEmbedHeight('soundcloud')}
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={audio.embedUrl}
            title="SoundCloud audio preview"
          />
        )}

        {audio.provider === 'spotify' && audio.embedUrl && (
          <iframe
            src={audio.embedUrl}
            width="100%"
            height={getAudioEmbedHeight('spotify')}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify audio preview"
          />
        )}

        {audio.provider === 'direct' && audio.embedUrl && (
          <div className="p-3 bg-gray-900 rounded-lg">
            <audio src={audio.embedUrl} controls className="w-full">
              <p>Your browser does not support audio playback.</p>
            </audio>
          </div>
        )}
      </div>

      {audio.provider !== 'direct' && (
        <div className="mt-2 flex justify-end">
          <a
            href={audio.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
          >
            Listen on {audio.provider === 'soundcloud' ? 'SoundCloud' : 'Spotify'}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EMBED PANEL COMPONENT (input + preview + visibility toggle)
// ============================================================================

interface EmbedPanelProps {
  label: string;
  icon: React.ReactNode;
  savedValue: string;
  placeholder: string;
  helpText: string;
  colorScheme: 'blue' | 'purple';
  onSave: (value: string) => Promise<void>;
  isSaving: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
  previewComponent: React.ReactNode | null;
}

function EmbedPanel({ label, icon, savedValue, placeholder, helpText, colorScheme, onSave, isSaving, isVisible, onToggleVisibility, previewComponent }: EmbedPanelProps) {
  const [inputValue, setInputValue] = useState(savedValue);
  const [isEditing, setIsEditing] = useState(false);

  // SEO metadata state
  const [seoAltText, setSeoAltText] = useState('');
  const [seoTitleText, setSeoTitleText] = useState('');
  const [showSeoFields, setShowSeoFields] = useState(false);
  const [isSavingSeo, setIsSavingSeo] = useState(false);
  const [seoSavedUrl, setSeoSavedUrl] = useState('');

  // Sync when saved data changes (e.g. after refresh)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(savedValue);
    }
  }, [savedValue, isEditing]);

  // Load SEO metadata when URL exists (uses fetchWithCsrf like VideoManager)
  useEffect(() => {
    if (!savedValue || savedValue === seoSavedUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithCsrf('/api/media/by-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ urls: [savedValue] }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const items = data?.data?.items ?? data?.items ?? [];
        const item = items[0];
        if (item && !cancelled) {
          setSeoAltText(item.altText || '');
          setSeoTitleText(item.titleText || '');
          setSeoSavedUrl(savedValue);
        }
      } catch {
        // Non-critical — SEO metadata is optional
      }
    })();
    return () => { cancelled = true; };
  }, [savedValue, seoSavedUrl]);

  // Save SEO metadata (same pattern as VideoManager handleSaveSEO)
  const handleSaveSeo = useCallback(async () => {
    if (!savedValue) return;
    setIsSavingSeo(true);
    try {
      // Step 1: Look up or auto-register the media record via by-urls
      const lookupRes = await fetchWithCsrf('/api/media/by-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ urls: [savedValue] }),
      });
      if (!lookupRes.ok) return;
      const lookupData = await lookupRes.json();
      const items = lookupData?.data?.items ?? lookupData?.items ?? [];
      const mediaItem = items[0];
      if (!mediaItem?.fileId) return;

      // Step 2: Save SEO metadata via /api/media/{id}/seo
      await fetchWithCsrf(`/api/media/${mediaItem.fileId}/seo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          altText: seoAltText.trim(),
          titleText: seoTitleText.trim(),
        }),
      });
      setSeoSavedUrl(savedValue);
    } catch {
      // Non-critical
    } finally {
      setIsSavingSeo(false);
    }
  }, [savedValue, seoAltText, seoTitleText]);

  const colors = colorScheme === 'blue'
    ? { bg: 'bg-blue-50', border: 'border-blue-200', inputBorder: 'border-blue-300', ring: 'focus:ring-blue-500', icon: 'text-blue-600', title: 'text-blue-900', text: 'text-blue-800', muted: 'text-blue-600', help: 'text-blue-500' }
    : { bg: 'bg-purple-50', border: 'border-purple-200', inputBorder: 'border-purple-300', ring: 'focus:ring-purple-500', icon: 'text-purple-600', title: 'text-purple-900', text: 'text-purple-800', muted: 'text-purple-600', help: 'text-purple-500' };

  const handleSave = async () => {
    await onSave(inputValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(savedValue);
    setIsEditing(false);
  };

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 flex-1 min-w-0`}>
      {/* Header with label + visibility toggle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colors.icon}>{icon}</span>
          <h3 className={`text-sm font-semibold ${colors.title}`}>{label}</h3>
        </div>
        <button
          onClick={onToggleVisibility}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            isVisible
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
          }`}
          title={isVisible ? `Hide ${label.toLowerCase()} on listing` : `Show ${label.toLowerCase()} on listing`}
        >
          {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isVisible ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {/* Hidden notice */}
      {!isVisible && savedValue && (
        <div className="mb-2 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500">
          Hidden on listing page. Content is saved but not displayed to visitors.
        </div>
      )}

      {/* URL input area */}
      {!isEditing ? (
        <div className="flex items-center gap-2">
          <p className={`text-sm ${savedValue ? colors.text : colors.muted} truncate flex-1 min-w-0 ${!savedValue ? 'italic' : ''}`}>
            {savedValue || 'Not set'}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className={`flex-shrink-0 p-1.5 ${colors.icon} hover:bg-white/50 rounded transition-colors`}
            title={`Edit ${label.toLowerCase()}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className={`flex-1 min-w-0 px-3 py-1.5 text-sm border ${colors.inputBorder} rounded-lg ${colors.ring} focus:ring-2 focus:border-transparent bg-white`}
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-shrink-0 p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              title="Save"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-shrink-0 p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className={`text-xs ${colors.help}`}>{helpText}</p>
        </div>
      )}

      {/* Preview player (shown when URL is saved) */}
      {savedValue && previewComponent}

      {/* SEO Metadata Fields (shown when URL is saved) */}
      {savedValue && (
        <div className="mt-3 border-t border-gray-200/60 pt-2">
          <button
            type="button"
            onClick={() => setShowSeoFields(!showSeoFields)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showSeoFields ? 'Hide' : 'Edit'} SEO Metadata
          </button>
          {showSeoFields && (
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Alt Text <span className="text-gray-400">(describes the content for accessibility)</span>
                </label>
                <input
                  type="text"
                  value={seoAltText}
                  onChange={(e) => setSeoAltText(e.target.value)}
                  maxLength={255}
                  placeholder="Describe what this media shows..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title <span className="text-gray-400">(displayed on hover, used by search engines)</span>
                </label>
                <input
                  type="text"
                  value={seoTitleText}
                  onChange={(e) => setSeoTitleText(e.target.value)}
                  maxLength={60}
                  placeholder="Brief title for this media..."
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-200 focus:border-orange-400 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSeo}
                disabled={isSavingSeo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md hover:bg-[#d55a31] transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#ed6437' }}
              >
                {isSavingSeo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                {isSavingSeo ? 'Saving...' : 'Save SEO'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DescriptionManagerContent() {
  const { selectedListingId, selectedListing, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  // Layout sync for visibility toggles (synced with listing page)
  const {
    isFeatureVisible,
    toggleFeatureVisibility
  } = useListingLayoutSync({
    listingId: selectedListingId,
    listingTier: (selectedListing?.tier || 'essentials') as ListingTier,
    autoLoad: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [embedSaving, setEmbedSaving] = useState(false);

  const maxLength = listing ? TIER_LIMITS[listing.tier as keyof typeof TIER_LIMITS]?.descriptionLength || 700 : 700;

  // Sanitize description HTML (lazy-loaded client-side to avoid jsdom SSR issues)
  const [sanitizedDescription, setSanitizedDescription] = useState(description || '');
  useEffect(() => {
    if (!description) { setSanitizedDescription(''); return; }
    getPurify().then(purify => setSanitizedDescription(purify.sanitize(description)));
  }, [description]);

  // Initialize from full listing data
  useEffect(() => {
    if (listing) {
      setDescription(listing.description || '');
    }
  }, [listing]);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setDescription(listing.description || '');
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      await updateListing({ description: description || undefined });
      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [description, updateListing, refreshListing, refreshListings]);

  const handleEmbedSave = useCallback(async (field: 'video_url' | 'audio_url', value: string) => {
    setEmbedSaving(true);
    try {
      let urlToSave = value.trim() || null;

      // For video URLs, resolve watch/short URLs to embeddable URLs server-side
      if (field === 'video_url' && urlToSave) {
        try {
          const resolveRes = await fetch('/api/video/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlToSave }),
          });
          if (resolveRes.ok) {
            const resolveData = await resolveRes.json();
            if (resolveData.success && resolveData.data?.changed) {
              urlToSave = resolveData.data.resolvedUrl;
            }
          }
        } catch {
          // Resolution failed — save original URL as fallback
        }
      }

      await updateListing({ [field]: urlToSave });
      await refreshListing();
      await refreshListings();
    } catch {
      // Error already set in hook
    } finally {
      setEmbedSaving(false);
    }
  }, [updateListing, refreshListing, refreshListings]);

  const handleToggleVideoVisibility = useCallback(() => {
    void toggleFeatureVisibility('video-embed' as FeatureId);
  }, [toggleFeatureVisibility]);

  const handleToggleAudioVisibility = useCallback(() => {
    void toggleFeatureVisibility('audio-embed' as FeatureId);
  }, [toggleFeatureVisibility]);

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error loading data
  if (loadError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{loadError}</span>
        <button
          onClick={() => refreshListing()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-8 text-gray-600">No listing selected</div>;
  }

  const videoUrl = listing.video_url || '';
  const audioUrl = listing.audio_url || '';

  return (
    <div className="space-y-6">
      {/* Video & Audio Embed Row - ABOVE description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmbedPanel
          label="Video Embed"
          icon={<Video className="w-4 h-4" />}
          savedValue={videoUrl}
          placeholder="https://www.youtube.com/watch?v=..."
          helpText="YouTube, Vimeo, Dailymotion, Rumble, or direct .mp4/.webm/.mov"
          colorScheme="blue"
          onSave={(val) => handleEmbedSave('video_url', val)}
          isSaving={embedSaving}
          isVisible={isFeatureVisible('video-embed' as FeatureId)}
          onToggleVisibility={handleToggleVideoVisibility}
          previewComponent={videoUrl ? <VideoPreview url={videoUrl} /> : null}
        />
        <EmbedPanel
          label="Audio Embed"
          icon={<Music className="w-4 h-4" />}
          savedValue={audioUrl}
          placeholder="https://soundcloud.com/artist/track"
          helpText="SoundCloud, Spotify, or direct .mp3/.wav/.ogg/.m4a"
          colorScheme="purple"
          onSave={(val) => handleEmbedSave('audio_url', val)}
          isSaving={embedSaving}
          isVisible={isFeatureVisible('audio-embed' as FeatureId)}
          onToggleVisibility={handleToggleAudioVisibility}
          previewComponent={audioUrl ? <AudioPreview url={audioUrl} /> : null}
        />
      </div>

      {/* Description Section */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Description</h2>
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={handleCancel} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50">
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button onClick={handleSave} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {updateError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3 mt-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{updateError}</span>
          </div>
        )}

        {!isEditing ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
            {description ? (
              <div
                className="prose prose-sm max-w-none text-gray-600"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            ) : (
              <p className="text-gray-500 italic">Not set</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Description
            </label>
            <DescriptionEditor
              value={description}
              onChange={setDescription}
              maxLength={maxLength}
              tier={(listing.tier as ListingTier) || 'essentials'}
              placeholder="Describe your business..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DescriptionManager() {
  return (
    <ErrorBoundary componentName="DescriptionManager">
      <DescriptionManagerContent />
    </ErrorBoundary>
  );
}

export default DescriptionManager;
