/**
 * PodcastCard - Grid view podcast card for Content page
 *
 * @component Client Component
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/offers/components/OfferCard.tsx - Pattern reference
 * @see docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Headphones, Star } from 'lucide-react';
import type { ContentPodcast } from '@core/services/ContentService';

interface PodcastCardProps {
  /** Podcast data */
  podcast: ContentPodcast;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number | null): string {
  if (!seconds) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format episode number
 */
function formatEpisode(season: number | null, episode: number | null): string | null {
  if (!episode) return null;
  if (season) {
    return `S${season}E${episode}`;
  }
  return `Ep ${episode}`;
}

/**
 * Format view count with K/M suffix (listen count for podcasts)
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * PodcastCard component
 * Displays podcast episode information in a card format for grid view
 */
export function PodcastCard({ podcast, className = '' }: PodcastCardProps) {
  const episodeBadge = formatEpisode(podcast.season_number, podcast.episode_number);

  return (
    <Link
      href={`/podcasts/${podcast.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Episode Artwork */}
        <div className="relative h-40 w-full bg-gray-100">
          {podcast.thumbnail ? (
            <Image
              src={podcast.thumbnail}
              alt={podcast.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
              <Headphones className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Episode Badge */}
          {episodeBadge && (
            <span className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {episodeBadge}
            </span>
          )}

          {/* Duration Badge */}
          {podcast.duration && (
            <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {formatDuration(podcast.duration)}
            </span>
          )}

          {/* Featured Badge */}
          {podcast.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}

          {/* Sponsored Badge (adjust position if episode badge exists) */}
          {podcast.is_sponsored && !episodeBadge && (
            <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Sponsored
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Episode Type Indicator */}
          <span className="text-xs font-medium uppercase text-teal-600 tracking-wide">
            PODCAST
          </span>

          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
            {podcast.title}
          </h3>

          {/* Description */}
          {podcast.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {podcast.description}
            </p>
          )}

          {/* Listen Count */}
          <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-3">
            <Headphones className="w-3.5 h-3.5" />
            <span>{formatViewCount(podcast.view_count)} listens</span>
          </p>
        </div>
      </article>
    </Link>
  );
}

export default PodcastCard;
