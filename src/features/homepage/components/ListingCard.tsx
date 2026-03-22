/**
 * ListingCard - Listing Display Card for Homepage
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 *
 * Phase 1B: Added share icon button with dynamic ListingShareModal import.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Route } from 'next';
import Image from 'next/image';
import { MapPin, Star, Share2 } from 'lucide-react';
import { ListingCardData } from '../types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';
import { SearchResultBadges } from '@features/listings/components/SearchResultBadges';

// Dynamic import: ListingShareModal uses browser APIs (clipboard, window.open)
const ListingShareModal = dynamic(
  () => import('@features/listings/components/ListingShareModal').then(
    (mod) => mod.ListingShareModal
  ),
  { ssr: false }
);

interface ListingCardProps {
  /** Listing data */
  listing: ListingCardData;
  /** Additional CSS classes */
  className?: string;
  /** Index in grid for LCP optimization */
  index?: number;
  /** Sub-entity counts for badge display */
  subCounts?: {
    jobCount?: number;
    eventCount?: number;
    offerCount?: number;
  };
}

/**
 * ListingCard component
 * Displays listing information in a card format for homepage sliders
 */
export function ListingCard({ listing, className = '', index = 0, subCounts }: ListingCardProps) {
  const { priority } = useLCPImagePriority({ layout: 'grid', index });
  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <Link
        href={`/listings/${listing.slug}` as Route}
        className={`flex-shrink-0 w-56 snap-start group ${className}`}
      >
        <article className={`relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full ${listing.is_featured ? 'ring-2 ring-amber-400/50' : ''}`}>
          {/* Logo/Cover Image - Square aspect for logo optimization */}
          <div className="relative aspect-square w-full bg-gradient-to-br from-gray-50 to-gray-100">
            {listing.logo_url ? (
              <Image
                src={listing.logo_url}
                alt={listing.name}
                fill
                priority={priority}
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 288px"
              />
            ) : listing.cover_image_url ? (
              <Image
                src={listing.cover_image_url}
                alt={listing.name}
                fill
                priority={priority}
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, 288px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-biz-navy/80">
                <span className="text-3xl font-bold text-white">
                  {listing.name.charAt(0)}
                </span>
              </div>
            )}

            {/* Featured Badge */}
            {listing.is_featured && (
              <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
                Featured
              </span>
            )}

            {/* Rating Badge */}
            {listing.rating !== undefined && listing.rating > 0 && (
              <span className="absolute top-3 right-3 bg-white text-biz-navy text-sm font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                {listing.rating.toFixed(1)}
              </span>
            )}

            {/* Share Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowShareModal(true);
              }}
              aria-label={`Share ${listing.name}`}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-600 hover:text-biz-orange p-1.5 rounded-full shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Category */}
            {listing.category_name && (
              <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
                {listing.category_name}
              </span>
            )}

            {/* Title */}
            <h3 className="font-semibold text-biz-navy mt-1 line-clamp-1 group-hover:text-biz-orange transition-colors">
              {listing.name}
            </h3>

            {/* Location */}
            {location && (
              <p className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{location}</span>
              </p>
            )}

            {/* Sub-entity badges */}
            <SearchResultBadges
              jobCount={subCounts?.jobCount}
              eventCount={subCounts?.eventCount}
              offerCount={subCounts?.offerCount}
            />
          </div>
        </article>
      </Link>

      {/* Share Modal — rendered outside Link to avoid nested interactive elements */}
      <ListingShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        listing={{
          id: listing.id,
          slug: listing.slug,
          name: listing.name,
          image: listing.logo_url ?? listing.cover_image_url ?? undefined,
        }}
        context="share"
      />
    </>
  );
}

export default ListingCard;
