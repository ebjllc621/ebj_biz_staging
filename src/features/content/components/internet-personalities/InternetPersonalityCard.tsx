/**
 * InternetPersonalityCard - Grid view profile card for Internet Personalities list
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/content/components/affiliate-marketers/AffiliateMarketerCard.tsx - Mirror pattern
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { MapPin, Star, CheckCircle } from 'lucide-react';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';
import { getAvatarInitials } from '@core/utils/avatar';

interface InternetPersonalityCardProps {
  personality: InternetPersonalityProfile;
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

export function InternetPersonalityCard({ personality, className = '' }: InternetPersonalityCardProps) {
  return (
    <Link
      href={`/internet-personalities/${personality.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Cover image */}
        <div className="relative h-32 w-full">
          {personality.cover_image ? (
            <Image
              src={personality.cover_image}
              alt={`${personality.display_name} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-700" />
          )}

          {/* Featured badge on cover */}
          {personality.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Profile photo overlapping cover */}
        <div className="relative px-4">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
            {personality.profile_image ? (
              <Image
                src={personality.profile_image}
                alt={personality.display_name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-semibold text-base"
                aria-hidden="true"
              >
                {getAvatarInitials(personality.display_name)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-10 pb-4">
          {/* Name + verified */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-biz-navy group-hover:text-biz-orange transition-colors line-clamp-1">
              {personality.display_name}
            </h3>
            {personality.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 font-medium shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
          </div>

          {/* Headline */}
          {personality.headline && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {personality.headline}
            </p>
          )}

          {/* Content category badges */}
          {personality.content_categories && personality.content_categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {personality.content_categories.slice(0, 3).map((category, index) => (
                <span
                  key={index}
                  className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          {/* Rating + Location row */}
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            {personality.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">
                  {Number(personality.rating_average).toFixed(1)}
                </span>
                <span>({personality.rating_count})</span>
              </span>
            )}
            {personality.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{personality.location}</span>
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 border-t pt-3">
            <span>
              <span className="font-semibold text-gray-700">{formatNumber(personality.total_reach)}</span>
              {' '}reach
            </span>
            <span>
              <span className="font-semibold text-gray-700">{formatNumber(personality.collaboration_count)}</span>
              {' '}collabs
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default InternetPersonalityCard;
