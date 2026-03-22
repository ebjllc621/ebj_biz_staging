/**
 * AffiliateMarketerCard - Grid view profile card for Affiliate Marketers list
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Tier 3 Creator Profiles - Phase 4
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/content/components/ArticleCard.tsx - Canonical card pattern
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { MapPin, Star, CheckCircle } from 'lucide-react';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';
import { getAvatarInitials } from '@core/utils/avatar';

interface AffiliateMarketerCardProps {
  marketer: AffiliateMarketerProfile;
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

export function AffiliateMarketerCard({ marketer, className = '' }: AffiliateMarketerCardProps) {
  return (
    <Link
      href={`/affiliate-marketers/${marketer.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Cover image */}
        <div className="relative h-32 w-full">
          {marketer.cover_image ? (
            <Image
              src={marketer.cover_image}
              alt={`${marketer.display_name} cover`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-700" />
          )}

          {/* Featured badge on cover */}
          {marketer.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        {/* Profile photo overlapping cover */}
        <div className="relative px-4">
          <div className="absolute -top-8 left-4 w-16 h-16 rounded-full border-2 border-white overflow-hidden shadow-sm bg-gray-100">
            {marketer.profile_image ? (
              <Image
                src={marketer.profile_image}
                alt={marketer.display_name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-semibold text-base"
                aria-hidden="true"
              >
                {getAvatarInitials(marketer.display_name)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-10 pb-4">
          {/* Name + verified */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-biz-navy group-hover:text-biz-orange transition-colors line-clamp-1">
              {marketer.display_name}
            </h3>
            {marketer.is_verified && (
              <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
          </div>

          {/* Headline */}
          {marketer.headline && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {marketer.headline}
            </p>
          )}

          {/* Niche badges */}
          {marketer.niches && marketer.niches.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {marketer.niches.slice(0, 3).map((niche, index) => (
                <span
                  key={index}
                  className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5"
                >
                  {niche}
                </span>
              ))}
            </div>
          )}

          {/* Rating + Location row */}
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            {marketer.rating_count > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">
                  {Number(marketer.rating_average).toFixed(1)}
                </span>
                <span>({marketer.rating_count})</span>
              </span>
            )}
            {marketer.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{marketer.location}</span>
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 border-t pt-3">
            <span>
              <span className="font-semibold text-gray-700">{formatNumber(marketer.campaign_count)}</span>
              {' '}campaigns
            </span>
            <span>
              <span className="font-semibold text-gray-700">{formatNumber(marketer.businesses_helped)}</span>
              {' '}helped
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default AffiliateMarketerCard;
