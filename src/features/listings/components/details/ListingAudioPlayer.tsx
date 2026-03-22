/**
 * ListingAudioPlayer - Audio Display Component
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase A - Details & Overview Embeds
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - SoundCloud, Spotify embed support
 * - Direct audio file playback (.mp3, .wav, .ogg, .m4a)
 * - Responsive layout
 * - Loading state
 * - Edit mode empty state
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/MASTER_INDEX_BRAIN_PLAN.md
 */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Music, ExternalLink, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ListingAudioPlayerProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

type AudioProvider = 'soundcloud' | 'spotify' | 'direct' | 'unknown';

interface ParsedAudio {
  provider: AudioProvider;
  embedUrl: string | null;
  trackId: string | null;
  originalUrl: string;
}

/**
 * Parse audio URL and extract embed information
 */
function parseAudioUrl(url: string): ParsedAudio {
  if (!url) {
    return { provider: 'unknown', embedUrl: null, trackId: null, originalUrl: url };
  }

  // SoundCloud
  // Supports: soundcloud.com/artist/track, soundcloud.com/artist/sets/playlist
  const soundcloudMatch = url.match(/soundcloud\.com\/([^/]+\/[^/]+(?:\/sets\/[^/]+)?)/);
  if (soundcloudMatch && soundcloudMatch[1]) {
    // SoundCloud requires encoding the full URL for embed
    const encodedUrl = encodeURIComponent(url);
    return {
      provider: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      trackId: soundcloudMatch[1],
      originalUrl: url
    };
  }

  // Spotify
  // Supports: open.spotify.com/track/..., open.spotify.com/album/..., open.spotify.com/playlist/...
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

  // Direct audio file
  const directAudioMatch = url.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i);
  if (directAudioMatch) {
    return {
      provider: 'direct',
      embedUrl: url,
      trackId: null,
      originalUrl: url
    };
  }

  return {
    provider: 'unknown',
    embedUrl: null,
    trackId: null,
    originalUrl: url
  };
}

/**
 * Get embed height based on provider
 */
function getEmbedHeight(provider: AudioProvider): number {
  switch (provider) {
    case 'soundcloud':
      return 166; // SoundCloud single track height
    case 'spotify':
      return 152; // Spotify compact height
    default:
      return 80; // Direct audio player
  }
}

export function ListingAudioPlayer({ listing, isEditMode }: ListingAudioPlayerProps) {
  // Parse audio URL
  const audio = useMemo(() => {
    if (!listing.audio_url) return null;
    return parseAudioUrl(listing.audio_url);
  }, [listing.audio_url]);

  const hasAudio = audio && audio.provider !== 'unknown';

  // Show empty state in edit mode when no audio
  if (isEditMode && !hasAudio) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Music className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Audio
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No audio yet. Add a SoundCloud, Spotify, or direct audio link.
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

  // Return null in published mode when no audio
  if (!hasAudio) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
        <Music className="w-5 h-5 text-biz-orange" />
        Audio
      </h2>

      <div className="rounded-lg overflow-hidden bg-gray-100">
        {/* SoundCloud Embed */}
        {audio.provider === 'soundcloud' && audio.embedUrl && (
          <iframe
            width="100%"
            height={getEmbedHeight('soundcloud')}
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={audio.embedUrl}
            title={`${listing.name} audio on SoundCloud`}
          />
        )}

        {/* Spotify Embed */}
        {audio.provider === 'spotify' && audio.embedUrl && (
          <iframe
            src={audio.embedUrl}
            width="100%"
            height={getEmbedHeight('spotify')}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={`${listing.name} audio on Spotify`}
          />
        )}

        {/* Direct Audio Element */}
        {audio.provider === 'direct' && audio.embedUrl && (
          <div className="p-4 bg-gray-900 rounded-lg">
            <audio
              src={audio.embedUrl}
              controls
              className="w-full"
            >
              <p className="text-gray-500">Your browser does not support audio playback.</p>
            </audio>
          </div>
        )}
      </div>

      {/* Listen on external link */}
      {audio.provider !== 'direct' && (
        <div className="mt-3 flex justify-end">
          <a
            href={audio.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-biz-orange flex items-center gap-1 transition-colors"
          >
            Listen on {audio.provider === 'soundcloud' ? 'SoundCloud' : 'Spotify'}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </section>
  );
}

export default ListingAudioPlayer;
