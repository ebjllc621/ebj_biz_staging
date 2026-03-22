/**
 * InternetPersonalityDetailHero - Hero section for internet personality detail page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 3A
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import { MapPin, CheckCircle, Share2, Users, Handshake } from 'lucide-react';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';
import { RecommendButton } from '@features/sharing/components/RecommendButton';

interface InternetPersonalityDetailHeroProps {
  personality: InternetPersonalityProfile;
  connectedPlatforms?: string[]; // Phase 9B — list of verified/connected platform names
  onCollaborateClick?: () => void;
  onShareClick?: () => void;
  onRecommendSuccess?: () => void;
  className?: string;
}

/**
 * Get platform-specific badge colors by platform name
 */
function getPlatformStyle(platform: string): { bg: string; text: string; border: string } {
  const lower = platform.toLowerCase();
  if (lower.includes('youtube') || lower === 'yt') {
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' };
  }
  if (lower.includes('instagram') || lower === 'ig') {
    return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100' };
  }
  if (lower.includes('tiktok') || lower === 'tt') {
    return { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' };
  }
  if (lower.includes('twitter') || lower === 'x' || lower === 'twitter/x') {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' };
  }
  if (lower.includes('facebook')) {
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' };
  }
  if (lower.includes('twitch')) {
    return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' };
  }
  if (lower.includes('linkedin')) {
    return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' };
  }
  // Default
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
}

/**
 * Format total reach for display (e.g. 455000 → "455K")
 */
function formatReach(reach: number): string {
  if (reach >= 1_000_000) {
    return `${(reach / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (reach >= 1_000) {
    return `${(reach / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return reach.toLocaleString();
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

export function InternetPersonalityDetailHero({
  personality,
  connectedPlatforms,
  onCollaborateClick,
  onShareClick,
  onRecommendSuccess,
  className = ''
}: InternetPersonalityDetailHeroProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Cover Image Banner */}
      <div className="relative w-full h-32 sm:h-48">
        {personality.cover_image ? (
          <Image
            src={personality.cover_image}
            alt={`${personality.display_name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-pink-600" />
        )}
      </div>

      {/* Profile Section */}
      <div className="px-6 pb-6">
        {/* Profile Photo — overlaps cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="-mt-12 sm:-mt-16">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-pink-600 flex-shrink-0">
              {personality.profile_image ? (
                <Image
                  src={personality.profile_image}
                  alt={personality.display_name}
                  fill
                  className="object-cover"
                  sizes="128px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-2xl sm:text-3xl font-bold">
                    {getInitials(personality.display_name)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons — right side, aligned bottom */}
          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:mb-1">
            <button
              onClick={onCollaborateClick}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Handshake className="w-4 h-4 flex-shrink-0" />
              <span>Collaborate</span>
            </button>
            <button
              onClick={onShareClick}
              className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
            >
              <Share2 className="w-4 h-4 flex-shrink-0" />
              <span>Share</span>
            </button>
            <RecommendButton
              entityType="internet_personality"
              entityId={personality.id.toString()}
              entityPreview={{
                title: personality.display_name,
                description: personality.headline || personality.bio?.substring(0, 100) || null,
                image_url: personality.profile_image || null,
                url: `/internet-personalities/${personality.slug}`
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
              {personality.display_name}
            </h1>
            {personality.is_verified && (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" aria-label="Verified" />
            )}
          </div>

          {/* Headline */}
          {personality.headline && (
            <p className="text-gray-600 mt-1 text-base">
              {personality.headline}
            </p>
          )}

          {/* Location + Creating Since + Total Reach */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
            {personality.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {personality.location}
              </span>
            )}
            {personality.creating_since && (
              <span className="flex items-center gap-1">
                Creating since {personality.creating_since}
              </span>
            )}
            {personality.total_reach > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                <Users className="w-3.5 h-3.5 flex-shrink-0" />
                {formatReach(personality.total_reach)} Total Reach
              </span>
            )}
            {personality.rating_count > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <span className="font-semibold">{Number(personality.rating_average).toFixed(1)}</span>
                <span>({personality.rating_count} {personality.rating_count === 1 ? 'review' : 'reviews'})</span>
              </span>
            )}
          </div>

          {/* Platform Badges */}
          {personality.platforms && personality.platforms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {personality.platforms.map((platform) => {
                const name = typeof platform === 'string' ? platform : platform.name;
                const style = getPlatformStyle(name);
                const isVerified = connectedPlatforms?.some(
                  cp => cp.toLowerCase() === name.toLowerCase()
                );
                return (
                  <span
                    key={name}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}
                  >
                    {name}
                    {isVerified && (
                      <CheckCircle
                        className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
                        aria-label="Verified — metrics synced automatically"
                      />
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Content Category Badges */}
          {personality.content_categories && personality.content_categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {personality.content_categories.map((category) => (
                <span
                  key={category}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InternetPersonalityDetailHero;
