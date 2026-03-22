/**
 * ListingCardHorizontal - Horizontal listing card for list view
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Display Options & Responsive Design
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Horizontal variant of ListingCard for list view display.
 * Shows image on left, content on right with description excerpt.
 * Maintains visual consistency with vertical ListingCard.
 *
 * @see docs/pages/layouts/listings/phases/PHASE_7_BRAIN_PLAN.md
 * @see src/features/homepage/components/ListingCard.tsx - Vertical card reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { MapPin, Star } from 'lucide-react';
import type { ListingWithCoordinates } from '@/features/listings/types';

interface ListingCardHorizontalProps {
  /** Listing data with coordinates */
  listing: ListingWithCoordinates;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ListingCardHorizontal component
 * Displays listing information in horizontal card format for list view
 */
export function ListingCardHorizontal({ listing, className = '' }: ListingCardHorizontalProps) {
  const location = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <Link
      href={`/listings/${listing.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        {/* Image Container - Square aspect for logo optimization */}
        <div className="relative w-full sm:w-40 md:w-44 aspect-square flex-shrink-0 bg-gradient-to-br from-gray-50 to-gray-100">
          {listing.logo_url ? (
            <Image
              src={listing.logo_url}
              alt={listing.name}
              fill
              className="object-contain"
            />
          ) : listing.cover_image_url ? (
            <Image
              src={listing.cover_image_url}
              alt={listing.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 224px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-biz-navy/80">
              <span className="text-2xl font-bold text-white">
                {listing.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Featured Badge */}
          {listing.is_featured && (
            <span className="absolute top-2 left-2 bg-biz-orange text-white text-xs font-medium px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {listing.category_name && (
                  <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
                    {listing.category_name}
                  </span>
                )}
                <h3 className="font-semibold text-biz-navy text-lg group-hover:text-biz-orange transition-colors line-clamp-1">
                  {listing.name}
                </h3>
              </div>

              {/* Rating Badge */}
              {listing.rating !== undefined && listing.rating > 0 && (
                <span className="flex-shrink-0 bg-gray-100 text-biz-navy text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                  {listing.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          {location && (
            <p className="flex items-center gap-1 text-sm text-gray-500 mt-auto">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default ListingCardHorizontal;
