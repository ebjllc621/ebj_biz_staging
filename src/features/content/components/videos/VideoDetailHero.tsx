/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1C - Video Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import {
  Play,
  Clock,
  Eye,
  Bookmark,
  Calendar,
  Share2,
  Flag,
  Star
} from 'lucide-react';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import type { ContentVideo } from '@core/services/ContentService';

interface VideoDetailHeroProps {
  video: ContentVideo;
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
 * Format view count with K/M suffix
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

export function VideoDetailHero({
  video,
  listingName,
  onShareClick,
  onBookmarkClick,
  onReportClick,
  isBookmarked = false,
  className = '',
  onRecommendSuccess
}: VideoDetailHeroProps) {
  const publishedDate = formatDate(video.published_at);
  const displayTags = video.tags.slice(0, 5);
  const durationLabel = formatDuration(video.duration);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* 16:9 Video Thumbnail */}
      <div className="relative w-full aspect-video bg-gray-100">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
            <Play className="w-16 h-16 text-white opacity-75" />
          </div>
        )}

        {/* Video Type Badge (top-left) — only show for non-youtube */}
        {video.video_type !== 'youtube' && (
          <span className="absolute top-3 left-3 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {video.video_type.toUpperCase()}
          </span>
        )}

        {/* Featured Badge (top-right) */}
        {video.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" />
            Featured
          </span>
        )}

        {/* Sponsored Badge (top-left, below type badge) */}
        {video.is_sponsored && (
          <span className="absolute top-10 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
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
          <span className="text-sm font-medium uppercase text-purple-600 tracking-wide">
            {listingName}
          </span>
        )}

        {/* Video Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy mt-2">
          {video.title}
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
            <Eye className="w-4 h-4" />
            {formatViewCount(video.view_count)} views
          </span>
          {video.bookmark_count > 0 && (
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4" />
              {formatViewCount(video.bookmark_count)}
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
                className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded"
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
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-gray-300 text-gray-700 hover:border-purple-600 hover:text-purple-600'
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
            entityType="video"
            entityId={video.id.toString()}
            entityPreview={{
              title: video.title,
              description: video.description?.substring(0, 200) || '',
              image_url: video.thumbnail || null,
              url: `/videos/${video.slug}`
            }}
            variant="secondary"
            size="sm"
            className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
            onRecommendSuccess={onRecommendSuccess}
          />
        </div>

        {/* Mobile Action Bar (inline — no separate component) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-around gap-2 max-w-lg mx-auto">
            <button
              onClick={onBookmarkClick}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isBookmarked ? 'text-purple-600' : 'text-gray-500 hover:text-purple-600'
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
              entityType="video"
              entityId={video.id.toString()}
              entityPreview={{
                title: video.title,
                description: video.description?.substring(0, 200) || '',
                image_url: video.thumbnail || null,
                url: `/videos/${video.slug}`
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

export default VideoDetailHero;
