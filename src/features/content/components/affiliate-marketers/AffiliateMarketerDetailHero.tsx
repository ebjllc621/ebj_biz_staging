/**
 * AffiliateMarketerDetailHero - Hero section for affiliate marketer detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import { MapPin, CheckCircle, Share2, Mail, Calendar } from 'lucide-react';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';
import { RecommendButton } from '@features/sharing/components/RecommendButton';

interface AffiliateMarketerDetailHeroProps {
  marketer: AffiliateMarketerProfile;
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

/**
 * Get initials from display name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AffiliateMarketerDetailHero({
  marketer,
  onContactClick,
  onShareClick,
  onRecommendSuccess,
  className = ''
}: AffiliateMarketerDetailHeroProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Cover Image Banner */}
      <div className="relative w-full h-32 sm:h-48">
        {marketer.cover_image ? (
          <Image
            src={marketer.cover_image}
            alt={`${marketer.display_name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600" />
        )}
      </div>

      {/* Profile Section */}
      <div className="px-6 pb-6">
        {/* Profile Photo — overlaps cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="-mt-12 sm:-mt-16">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
              {marketer.profile_image ? (
                <Image
                  src={marketer.profile_image}
                  alt={marketer.display_name}
                  fill
                  className="object-cover"
                  sizes="128px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl sm:text-3xl font-bold">
                    {getInitials(marketer.display_name)}
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
              entityType="affiliate_marketer"
              entityId={marketer.id.toString()}
              entityPreview={{
                title: marketer.display_name,
                description: marketer.headline || marketer.bio?.substring(0, 100) || null,
                image_url: marketer.profile_image || null,
                url: `/affiliate-marketers/${marketer.slug}`
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
          {/* Display Name + Verified Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy">
              {marketer.display_name}
            </h1>
            {marketer.is_verified && (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" aria-label="Verified" />
            )}
          </div>

          {/* Headline */}
          {marketer.headline && (
            <p className="text-gray-600 mt-1 text-base">
              {marketer.headline}
            </p>
          )}

          {/* Location + Member Since */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {marketer.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {marketer.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              Member since {formatMemberSince(marketer.created_at)}
            </span>
            {marketer.rating_count > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="font-semibold">{Number(marketer.rating_average).toFixed(1)}</span>
                <span>({marketer.rating_count} {marketer.rating_count === 1 ? 'review' : 'reviews'})</span>
              </span>
            )}
          </div>

          {/* Niche Badges */}
          {marketer.niches && marketer.niches.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {marketer.niches.map((niche) => (
                <span
                  key={niche}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                >
                  {niche}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AffiliateMarketerDetailHero;
