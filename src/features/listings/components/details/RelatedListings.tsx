/**
 * RelatedListings - Similar Businesses Carousel
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 9 - Performance & SEO (Image Optimization)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Display 4-8 related listings
 * - Same category filter
 * - Exclude current listing
 * - Horizontal scrollable carousel on mobile
 * - Grid layout on desktop
 * - "See More" link to category search
 * - Optimized images with next/image
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { TrendingUp, ExternalLink, Star } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface RelatedListingsProps {
  /** Current listing */
  listing: Listing;
}

/**
 * Simple listing card for related listings
 */
function RelatedListingCard({ listing }: { listing: Listing }) {
  return (
    <a
      href={`/listings/${listing.slug}`}
      className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
    >
      {/* Logo/Cover Image - Square aspect for logo optimization */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {listing.logo_url ? (
          <Image
            src={listing.logo_url}
            alt={listing.name}
            fill
            className="object-contain"
            loading="lazy"
          />
        ) : listing.cover_image_url ? (
          <Image
            src={listing.cover_image_url}
            alt={listing.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="(max-width: 768px) 90vw, (max-width: 1024px) 45vw, 300px"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-biz-navy/80">
            <span className="text-2xl font-bold text-white">
              {listing.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name */}
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
          {listing.name}
        </h3>

        {/* Type */}
        {listing.type && (
          <p className="text-sm text-gray-500 mb-2">{listing.type}</p>
        )}

        {/* Location */}
        {listing.city && listing.state && (
          <p className="text-xs text-gray-500 mt-2">
            {listing.city}, {listing.state}
          </p>
        )}
      </div>
    </a>
  );
}

export function RelatedListings({ listing }: RelatedListingsProps) {
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch related listings
  useEffect(() => {
    let isMounted = true;

    async function fetchRelated() {
      setIsLoading(true);
      setError(null);

      try {
        // Use search endpoint with category filter and exclude current listing
        const params = new URLSearchParams({
          category: listing.category_id?.toString() || '',
          exclude: listing.id.toString(),
          limit: '8',
          status: 'active'
        });

        const response = await fetch(
          `/api/listings/search?${params.toString()}`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch related listings');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setRelatedListings(result.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load related listings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (listing.category_id) {
      fetchRelated();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [listing.id, listing.category_id]);

  // Don't render if no related listings and not loading
  if (!isLoading && relatedListings.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-biz-orange" />
          Similar Businesses
          {relatedListings.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({relatedListings.length})
            </span>
          )}
        </h2>

        {listing.category_id && relatedListings.length > 0 && (
          <a
            href={`/listings?category=${listing.category_id}`}
            className="text-sm text-biz-orange hover:text-biz-orange/80 flex items-center gap-1"
          >
            See More
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {/* Related Listings Grid */}
      {!isLoading && relatedListings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {relatedListings.slice(0, 4).map((relatedListing) => (
            <RelatedListingCard key={relatedListing.id} listing={relatedListing} />
          ))}
        </div>
      )}
    </section>
  );
}

export default RelatedListings;
