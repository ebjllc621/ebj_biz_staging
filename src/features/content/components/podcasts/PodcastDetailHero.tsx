/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1B - Podcast Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import {
  Headphones,
  Clock,
  Bookmark,
  Calendar,
  Share2,
  Flag,
  Star,
  Mic
} from 'lucide-react';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import type { ContentPodcast } from '@core/services/ContentService';

interface PodcastDetailHeroProps {
  podcast: ContentPodcast;
  listingName?: string;
  listingLogo?: string;
  onShareClick: () => void;
  onBookmarkClick: () => void;
  onReportClick: () => void;
  isBookmarked?: boolean;
  className?: string;
  onRecommendSuccess?: () => void;
}

/**
 * Format duration in seconds to H:MM:SS or MM:SS
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
 * Format episode identifier as S{N}E{N} or Ep {N}
 */
function formatEpisode(season: number | null, episode: number | null): string | null {
  if (!episode) return null;
  if (season) return `S${season}E${episode}`;
  return `Ep ${episode}`;
}

/**
 * Format listen/view count with K/M suffix
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

export function PodcastDetailHero({
  podcast,
  listingName,
  onShareClick,
  onBookmarkClick,
  onReportClick,
  isBookmarked = false,
  className = '',
  onRecommendSuccess
}: PodcastDetailHeroProps) {
  const publishedDate = formatDate(podcast.published_at);
  const displayTags = podcast.tags.slice(0, 5);
  const episodeLabel = formatEpisode(podcast.season_number, podcast.episode_number);
  const durationLabel = formatDuration(podcast.duration);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Square Artwork */}
      <div className="relative w-full bg-gray-100" style={{ aspectRatio: '1 / 1', maxHeight: '16rem' }}>
        {podcast.thumbnail ? (
          <Image
            src={podcast.thumbnail}
            alt={podcast.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700">
            <Headphones className="w-16 h-16 text-white opacity-75" />
          </div>
        )}

        {/* Episode Badge (top-left) */}
        {episodeLabel && (
          <span className="absolute top-3 left-3 bg-teal-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Mic className="w-3 h-3" />
            {episodeLabel}
          </span>
        )}

        {/* Featured Badge */}
        {podcast.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" />
            Featured
          </span>
        )}

        {/* Sponsored Badge */}
        {podcast.is_sponsored && (
          <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
            Sponsored
          </span>
        )}

        {/* Duration Badge (bottom-right) */}
        {durationLabel && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {durationLabel}
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Listing Name */}
        {listingName && (
          <span className="text-sm font-medium uppercase text-teal-600 tracking-wide">
            {listingName}
          </span>
        )}

        {/* Podcast Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy mt-2">
          {podcast.title}
        </h1>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-4">
          {durationLabel && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {durationLabel}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Headphones className="w-4 h-4" />
            {formatViewCount(podcast.view_count)} listens
          </span>
          {podcast.bookmark_count > 0 && (
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4" />
              {formatViewCount(podcast.bookmark_count)}
            </span>
          )}
          {publishedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {publishedDate}
            </span>
          )}
        </div>

        {/* Tags Row */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {displayTags.map((tag, index) => (
              <span
                key={index}
                className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 mt-6">
          <button
            onClick={onBookmarkClick}
            className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
              isBookmarked
                ? 'border-teal-600 text-teal-600 bg-teal-50'
                : 'border-gray-300 text-gray-700 hover:border-teal-600 hover:text-teal-600'
            }`}
          >
            <Bookmark className="w-4 h-4 flex-shrink-0" />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>

          <button
            onClick={onShareClick}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
          >
            <Share2 className="w-4 h-4 flex-shrink-0" />
            Share
          </button>

          <button
            onClick={onReportClick}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Flag className="w-4 h-4 flex-shrink-0" />
            Report
          </button>

          <RecommendButton
            entityType="podcast"
            entityId={podcast.id.toString()}
            entityPreview={{
              title: podcast.title,
              description: podcast.description || '',
              image_url: podcast.thumbnail || null,
              url: `/podcasts/${podcast.slug}`
            }}
            variant="secondary"
            size="sm"
            className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
            onRecommendSuccess={onRecommendSuccess}
          />
        </div>

        {/* Mobile Action Bar (inline — no separate ArticleActionBar component) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-around gap-2 max-w-lg mx-auto">
            <button
              onClick={onBookmarkClick}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isBookmarked ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'
              }`}
            >
              <Bookmark className="w-5 h-5" />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>

            <button
              onClick={onShareClick}
              className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 hover:text-biz-navy transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>

            <button
              onClick={onReportClick}
              className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Flag className="w-5 h-5" />
              Report
            </button>

            <RecommendButton
              entityType="podcast"
              entityId={podcast.id.toString()}
              entityPreview={{
                title: podcast.title,
                description: podcast.description || '',
                image_url: podcast.thumbnail || null,
                url: `/podcasts/${podcast.slug}`
              }}
              variant="secondary"
              size="sm"
              className="!py-1.5 !px-3 !border !rounded-lg !font-medium !text-xs !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4"
              onRecommendSuccess={onRecommendSuccess}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PodcastDetailHero;
