/**
 * VideoCard - Grid view video card for Content page
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
import { Play, Eye, Star } from 'lucide-react';
import type { ContentVideo } from '@core/services/ContentService';

interface VideoCardProps {
  /** Video data */
  video: ContentVideo;
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
 * Format view count with K/M suffix
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
 * VideoCard component
 * Displays video information in a card format for grid view
 */
export function VideoCard({ video, className = '' }: VideoCardProps) {
  return (
    <Link
      href={`/videos/${video.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Thumbnail with Play Overlay */}
        <div className="relative h-40 w-full bg-gray-100">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
              <Play className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="bg-white/90 rounded-full p-3 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-biz-navy fill-current" />
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration && (
            <span className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-medium px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </span>
          )}

          {/* Featured Badge */}
          {video.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}

          {/* Sponsored Badge */}
          {video.is_sponsored && (
            <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Sponsored
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Video Type Indicator */}
          <span className="text-xs font-medium uppercase text-purple-600 tracking-wide">
            {video.video_type}
          </span>

          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
            {video.title}
          </h3>

          {/* Description */}
          {video.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {video.description}
            </p>
          )}

          {/* View Count */}
          <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-3">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatViewCount(video.view_count)} views</span>
          </p>
        </div>
      </article>
    </Link>
  );
}

export default VideoCard;
