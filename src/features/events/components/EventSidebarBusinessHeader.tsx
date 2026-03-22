/**
 * EventSidebarBusinessHeader - Business Name, Logo, and Rating
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Listing } from '@core/services/ListingService';

interface EventSidebarBusinessHeaderProps {
  listing: Listing;
}

export function EventSidebarBusinessHeader({ listing }: EventSidebarBusinessHeaderProps) {
  // average_rating and review_count are joined columns not on the base Listing type
  const listingAny = listing as Listing & { average_rating?: number; review_count?: number };
  const averageRating = listingAny.average_rating;
  const reviewCount = listingAny.review_count;

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
          {listing.logo_url && (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={listing.logo_url}
                alt={`${listing.name} logo`}
                fill
                className="object-cover"
              />
            </div>
          )}

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
                  {Number(averageRating).toFixed(1)}
                </span>
                {reviewCount != null && reviewCount > 0 && (
                  <span className="text-gray-500">
                    ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                )}
              </div>
            )}

            {/* Category Tag */}
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

export default EventSidebarBusinessHeader;
