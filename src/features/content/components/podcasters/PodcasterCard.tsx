/**
 * PodcasterCard - Grid view profile card for Podcasters list
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Podcaster Parity - Phase 7
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/content/components/affiliate-marketers/AffiliateMarketerCard.tsx - Canonical card pattern
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { MapPin, Star, CheckCircle, Mic } from 'lucide-react';
import type { PodcasterProfile } from '@core/types/podcaster';
import { getAvatarInitials } from '@core/utils/avatar';

interface PodcasterCardProps {
  podcaster: PodcasterProfile;
  className?: string;
}

/**
 * Format a number with K/M suffix
 */
function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

export function PodcasterCard({ podcaster, className = '' }: PodcasterCardProps) {
  return (
    <Link
      href={`/podcasters/${podcaster.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Cover image */}
        <div className="relative h-32 w-full">
          {podcaster.cover_image ? (
            <Image
              src={podcaster.cover_image}
              alt={`${podcaster.display_name} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-700" />
          )}

          {/* Featured badge on cover */}
          {podcaster.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Profile photo overlapping cover */}
        <div className="relative px-4">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
            {podcaster.profile_image ? (
              <Image
                src={podcaster.profile_image}
                alt={podcaster.display_name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-orange-600 text-white font-semibold text-base"
                aria-hidden="true"
              >
                {getAvatarInitials(podcaster.display_name)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-10 pb-4">
          {/* Podcast name */}
          {podcaster.podcast_name && (
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5 line-clamp-1">
              {podcaster.podcast_name}
            </p>
          )}

          {/* Display name + verified */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-biz-navy group-hover:text-biz-orange transition-colors line-clamp-1">
              {podcaster.display_name}
            </h3>
            {podcaster.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 font-medium shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
          </div>

          {/* Headline */}
          {podcaster.headline && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {podcaster.headline}
            </p>
          )}

          {/* Genre badges */}
          {podcaster.genres && podcaster.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {podcaster.genres.slice(0, 3).map((genre, index) => (
                <span
                  key={index}
                  className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Rating + Location row */}
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            {podcaster.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">
                  {Number(podcaster.rating_average).toFixed(1)}
                </span>
                <span>({podcaster.rating_count})</span>
              </span>
            )}
            {podcaster.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{podcaster.location}</span>
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 border-t pt-3">
            <span className="flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{formatNumber(podcaster.total_episodes)}</span>
              {' '}episodes
            </span>
            {podcaster.download_count > 0 && (
              <span>
                <span className="font-semibold text-gray-700">{formatNumber(podcaster.download_count)}</span>
                {' '}downloads
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default PodcasterCard;
