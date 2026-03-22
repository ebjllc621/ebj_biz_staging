/**
 * QuickContactCard - Listing Name Header Card
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 6 - Sidebar Components (Logo + Name + Type Badge + Rating)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Logo display (left-aligned)
 * - Business name display (always visible at top of sidebar)
 * - Listing type badge (e.g. "Service Provider")
 * - Star rating if available
 * - Clean header card design (matches Jobs sidebar pattern, no cover image)
 *
 * NOTE: Contact info, hours, and location are now in separate sidebar cards
 * (SidebarContactCard, SidebarHoursCard, SidebarLocationCard) to prevent
 * redundancy. This card serves as the sidebar header only.
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_6_BRAIN_PLAN.md
 */
'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import type { Listing } from '@core/services/ListingService';

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

interface QuickContactCardProps {
  /** Listing data */
  listing: Listing;
}

export function QuickContactCard({ listing }: QuickContactCardProps) {
  const averageRating = (listing as any).average_rating;
  const reviewCount = (listing as any).review_count;
  const typeName = getTypeName(listing.type);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Logo */}
          {listing.logo_url && (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <Image
                src={listing.logo_url}
                alt={`${listing.name} logo`}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Business Name */}
            <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
              {listing.name}
            </h3>

            {/* Rating (if available) */}
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

            {/* Listing Type Badge */}
            {typeName && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                {typeName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickContactCard;
