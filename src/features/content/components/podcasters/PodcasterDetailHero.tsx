/**
 * PodcasterDetailHero - Hero section for podcaster detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Podcaster Parity - Phase 7
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders: Cover image banner, profile photo, podcast name, display name,
 * verified badge, platform badges (listening platforms), location, action buttons.
 *
 * @see src/features/content/components/affiliate-marketers/AffiliateMarketerDetailHero.tsx - Canonical pattern
 */
'use client';

import Image from 'next/image';
import { MapPin, CheckCircle, Share2, Mail, Calendar, Headphones } from 'lucide-react';
import type { PodcasterProfile } from '@core/types/podcaster';
import { getAvatarInitials } from '@core/utils/avatar';
import { RecommendButton } from '@features/sharing/components/RecommendButton';

interface PodcasterDetailHeroProps {
  podcaster: PodcasterProfile;
  onContactClick?: () => void;
  onShareClick?: () => void;
  onRecommendSuccess?: () => void;
  className?: string;
}

/**
 * Format member since date from created_at
 */
function formatMemberSince(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

export function PodcasterDetailHero({
  podcaster,
  onContactClick,
  onShareClick,
  onRecommendSuccess,
  className = ''
}: PodcasterDetailHeroProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Cover Image Banner */}
      <div className="relative w-full h-32 sm:h-48">
        {podcaster.cover_image ? (
          <Image
            src={podcaster.cover_image}
            alt={`${podcaster.display_name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-500 to-red-600" />
        )}
      </div>

      {/* Profile Section */}
      <div className="px-6 pb-6">
        {/* Profile Photo — overlaps cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="-mt-12 sm:-mt-16">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 flex-shrink-0">
              {podcaster.profile_image ? (
                <Image
                  src={podcaster.profile_image}
                  alt={podcaster.display_name}
                  fill
                  className="object-cover"
                  sizes="128px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl sm:text-3xl font-bold">
                    {getAvatarInitials(podcaster.display_name)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons — right side, aligned bottom */}
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:mb-1">
            <button
              onClick={onContactClick}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span>Contact</span>
            </button>
            <button
              onClick={onShareClick}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
            >
              <Share2 className="w-4 h-4 flex-shrink-0" />
              <span>Share</span>
            </button>
            <RecommendButton
              entityType="podcaster"
              entityId={podcaster.id.toString()}
              entityPreview={{
                title: podcaster.podcast_name ?? podcaster.display_name,
                description: podcaster.headline || podcaster.bio?.substring(0, 100) || null,
                image_url: podcaster.profile_image || null,
                url: `/podcasters/${podcaster.slug}`
              }}
              variant="secondary"
              size="sm"
              className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
              onRecommendSuccess={onRecommendSuccess}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-4">
          {/* Podcast name */}
          {podcaster.podcast_name && (
            <p className="text-sm text-orange-600 font-medium mb-1">
              {podcaster.podcast_name}
            </p>
          )}

          {/* Display Name + Verified Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy">
              {podcaster.display_name}
            </h1>
            {podcaster.is_verified && (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" aria-label="Verified" />
            )}
          </div>

          {/* Headline */}
          {podcaster.headline && (
            <p className="text-gray-600 mt-1 text-base">
              {podcaster.headline}
            </p>
          )}

          {/* Location + Member Since + Rating */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {podcaster.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {podcaster.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              Member since {formatMemberSince(podcaster.created_at)}
            </span>
            {podcaster.rating_count > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="font-semibold">{Number(podcaster.rating_average).toFixed(1)}</span>
                <span>({podcaster.rating_count} {podcaster.rating_count === 1 ? 'review' : 'reviews'})</span>
              </span>
            )}
          </div>

          {/* Listening Platform Badges */}
          {podcaster.platforms && podcaster.platforms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="flex items-center gap-1 text-xs text-gray-500 mr-1">
                <Headphones className="w-3.5 h-3.5" />
                Listen on:
              </span>
              {podcaster.platforms.map((platform) => {
                const name = typeof platform === 'string' ? platform : platform.name;
                return (
                  <span
                    key={name}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Genre Badges */}
          {podcaster.genres && podcaster.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {podcaster.genres.map((genre) => (
                <span
                  key={genre}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PodcasterDetailHero;
