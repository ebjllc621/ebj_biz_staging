/**
 * ContentSidebarBusinessHeader - Business Name, Logo, and Rating for Content Sidebars
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Content Sidebar Unification
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @reference src/features/jobs/components/JobSidebarBusinessHeader.tsx
 */
'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from '@core/services/ListingService';
import { getAvatarInitials } from '@core/utils/avatar';

interface ContentSidebarBusinessHeaderProps {
  listing: Listing;
  /** Accent color for avatar fallback gradient (default: biz-orange) */
  accentColor?: 'orange' | 'purple' | 'teal';
}

const GRADIENT_MAP = {
  orange: 'from-orange-500 to-orange-700',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
} as const;

export function ContentSidebarBusinessHeader({ listing, accentColor = 'orange' }: ContentSidebarBusinessHeaderProps) {
  const averageRating = (listing as any).average_rating;
  const reviewCount = (listing as any).review_count;
  const gradient = GRADIENT_MAP[accentColor];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Cover Image Thumbnail (if available) */}
      {listing.cover_image_url && (
        <div className="relative h-24 w-full">
          <Image
            src={listing.cover_image_url}
            alt={`${listing.name} cover`}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            {listing.logo_url ? (
              <Image
                src={listing.logo_url}
                alt={`${listing.name} logo`}
                fill
                className="object-cover"
              />
            ) : (
              <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient}`}>
                <span className="text-white text-sm font-bold">
                  {getAvatarInitials(listing.name)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Business Name - Links to listing page */}
            <Link
              href={`/listings/${listing.slug}`}
              className="text-lg font-semibold text-gray-900 hover:text-biz-orange transition-colors line-clamp-2"
            >
              {listing.name}
            </Link>

            {/* Rating */}
            {averageRating && (
              <div className="flex items-center gap-1 text-sm mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
                {reviewCount > 0 && (
                  <span className="text-gray-500">
                    ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </div>
            )}

            {/* Category Tags */}
            {listing.type && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {listing.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentSidebarBusinessHeader;
