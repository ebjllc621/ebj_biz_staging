/**
 * ListingHero - Hero section for listing details page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1 - Hero & Action Bar (Redesigned to match preview modal layout)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Hero section displaying:
 * - Full-width cover image
 * - Square logo with rounded corners, center-aligned, overlapping cover bottom
 * - White info card: type badge, rating stars, business name, action buttons
 * - Responsive mobile/desktop layout
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_1_BRAIN_PLAN.md
 * @see src/features/listings/components/NewListingModal/shared/ListingPreview/ListingHeroPreview.tsx
 */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
// eslint-disable-next-line @next/next/no-img-element -- Logo uses raw img to bypass Next.js optimization for crisp display
import { Star, Building2, Calendar, Users } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { ListingCompletionIndicator } from './ListingCompletionIndicator';
import type { ListingCompletionResult } from '../../utils/calculateListingCompleteness';
import { getAvatarInitials } from '@core/utils/avatar';

/**
 * Convert type ID to human-readable name (backward compat for existing data)
 */
const getTypeName = (type: string | null): string => {
  if (!type) return '';
  if (isNaN(Number(type))) return type;
  const typeMap: Record<string, string> = {
    '1': 'Business',
    '2': 'Non-Profit',
    '3': 'Government',
    '4': 'Professional Association',
    '5': 'Other Group',
    '6': 'Creator',
    '14': 'Service Provider',
  };
  return typeMap[type] || type;
};

/**
 * Render star rating display
 */
const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-5 h-5 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : i < rating ? 'text-yellow-400 fill-yellow-400/50' : 'text-gray-300'}`}
    />
  ));
};

interface ListingHeroProps {
  /** Listing data */
  listing: Listing;
  /** Completion data (optional) */
  completion?: ListingCompletionResult | null;
  /** Whether current user is the owner */
  isOwner?: boolean;
  /** Handler to open edit modal */
  onEditClick?: () => void;
}

/**
 * ListingHero component
 * Displays hero section with cover image, overlapping logo, and info card with quick facts
 */
export function ListingHero({
  listing,
  completion,
  isOwner,
  onEditClick,
}: ListingHeroProps) {
  // Fetch real rating data from reviews API
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!listing.id) return;
    fetch(`/api/listings/${listing.id}/reviews?limit=1`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const d = data?.data?.distribution;
        if (d) {
          setRating(d.average || 0);
          setReviewCount(d.total || 0);
        }
      })
      .catch(() => { /* silent */ });
  }, [listing.id]);

  return (
    <div className="relative w-full bg-gray-50">
      {/* Completion Indicator - above hero for owner/admin */}
      {isOwner && completion && (
        <div className="container mx-auto px-4 py-2">
          <ListingCompletionIndicator
            completion={completion}
            variant="compact"
            isOwner={isOwner}
            onEditClick={onEditClick}
          />
        </div>
      )}

      {/* Cover Image Section - 3.2:1 aspect ratio matching cropper output (960x300) */}
      <div className="relative w-full bg-gray-200 overflow-hidden" style={{ aspectRatio: '3.2 / 1' }}>
        {listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-biz-navy to-biz-navy/80" />
        )}
        {/* Subtle gradient at bottom for logo overlap area */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Logo - Square with rounded corners, centered, overlapping cover bottom */}
      {/* Desktop: ~50% below cover edge, Mobile: ~20% below */}
      <div className="relative flex justify-center" style={{ marginTop: '-3.5rem' }}>
        <div className="md:hidden">
          {/* Mobile logo: 1:1 square, rounded-xl (1rem) corners clip the image - matches cropper preview */}
          {listing.logo_url ? (
            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg ring-2 ring-white bg-white">
              <img
                src={listing.logo_url}
                alt={`${listing.name} logo`}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'auto' }}
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-biz-navy flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-2 ring-white">
              {getAvatarInitials(listing.name)}
            </div>
          )}
        </div>
        <div className="hidden md:block" style={{ marginTop: '-1.5rem' }}>
          {/* Desktop logo: 1:1 square, rounded-2xl (1rem) corners clip the image - matches cropper preview */}
          {listing.logo_url ? (
            <div className="w-36 h-36 rounded-2xl overflow-hidden shadow-xl ring-4 ring-white bg-white">
              <img
                src={listing.logo_url}
                alt={`${listing.name} logo`}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'auto' }}
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-36 h-36 rounded-2xl bg-biz-navy flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-white">
              {getAvatarInitials(listing.name)}
            </div>
          )}
        </div>
      </div>

      {/* Info Card - White card below logo */}
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-md border border-gray-100 px-6 py-5 mt-3 mb-6 flex flex-col items-center">
          {/* Badges + Rating Stars - single row (type badge removed per layout update) */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
            {listing.claimed && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                ✓ Verified
              </span>
            )}
            {/* Rating Stars inline with badges */}
            <div className="flex items-center gap-1">
              {renderStars(rating)}
              <span className="text-sm text-gray-500 ml-1">
                {rating > 0 ? `${rating.toFixed(1)} (${reviewCount} reviews)` : 'No reviews yet'}
              </span>
            </div>
          </div>

          {/* Business Name */}
          <h1 className="text-2xl md:text-3xl font-bold text-[#022641] text-center mb-1">
            {listing.name}
          </h1>

          {/* Slogan */}
          {listing.slogan && (
            <p className="text-sm md:text-base text-gray-500 italic text-center mb-4">
              {listing.slogan}
            </p>
          )}
          {!listing.slogan && <div className="mb-3" />}

          {/* Quick Facts - inline below slogan, no section title */}
          {(listing.type || listing.year_established || listing.employee_count) && (
            <div className="flex flex-wrap justify-center gap-4 pt-2 border-t border-gray-100">
              {listing.type && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">Type</p>
                    <p className="text-xs font-medium text-gray-900">{getTypeName(listing.type)}</p>
                  </div>
                </div>
              )}
              {listing.year_established && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">Established</p>
                    <p className="text-xs font-medium text-gray-900">{listing.year_established}</p>
                  </div>
                </div>
              )}
              {listing.employee_count && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 leading-tight">Employees</p>
                    <p className="text-xs font-medium text-gray-900">{listing.employee_count}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
