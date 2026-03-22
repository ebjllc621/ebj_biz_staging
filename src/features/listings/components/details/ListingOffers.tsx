/**
 * ListingOffers - Associated Offers Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Related Content
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Display up to 4 featured offers
 * - Price display with discount calculation
 * - Offer type badges (Product/Service/Discount/Bundle)
 * - Click opens offer detail modal
 * - "View All Offers" link to dedicated offers page
 * - Empty state when no offers
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, ExternalLink, ShoppingCart, Clock, Percent, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Offer {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: 'product' | 'service' | 'discount' | 'bundle';
  original_price: number | null;
  sale_price: number | null;
  discount_percentage: number | null;
  image: string | null;
  thumbnail: string | null;
  start_date: Date | null;
  end_date: Date | null;
  quantity_total: number | null;
  quantity_remaining: number | null;
  max_per_user: number | null;
  redemption_code: string | null;
  redemption_instructions: string | null;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ListingOffersProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

/**
 * Calculate days until offer expires
 */
function getDaysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null;

  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Format price with currency
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
}

export function ListingOffers({ listing, isEditMode }: ListingOffersProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch offers
  useEffect(() => {
    let isMounted = true;

    async function fetchOffers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/offers?listingId=${listing.id}&limit=4&is_featured=true`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setOffers(result.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load offers');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOffers();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no offers
  if (isEditMode && !isLoading && offers.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Tag className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Special Offers
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No offers yet. Create special deals and promotions for your customers.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/offers` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no offers
  if (!isLoading && offers.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Tag className="w-5 h-5 text-biz-orange" />
          Special Offers
          {offers.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({offers.length})
            </span>
          )}
        </h2>

        {offers.length > 0 && (
          <a
            href={`/listings/${listing.slug}/offers`}
            className="text-sm text-biz-orange hover:text-biz-orange/80 flex items-center gap-1"
          >
            View All
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-48" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
        </div>
      )}

      {/* Offers Grid */}
      {!isLoading && offers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => {
            const daysRemaining = getDaysRemaining(offer.end_date);
            const hasDiscount = offer.original_price && offer.sale_price && offer.original_price > offer.sale_price;

            return (
              <a
                key={offer.id}
                href={`/offers/${offer.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
              >
                {/* Image */}
                {offer.thumbnail && (
                  <div className="relative mb-3 rounded-lg overflow-hidden bg-gray-100 aspect-video">
                    <img
                      src={offer.thumbnail}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />

                    {/* Discount Badge */}
                    {offer.discount_percentage && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {offer.discount_percentage}% OFF
                      </div>
                    )}
                  </div>
                )}

                {/* Offer Type Badge */}
                <span className={`
                  inline-block px-2 py-1 rounded-full text-xs font-medium mb-2
                  ${offer.offer_type === 'product' ? 'bg-blue-100 text-blue-700' : ''}
                  ${offer.offer_type === 'service' ? 'bg-green-100 text-green-700' : ''}
                  ${offer.offer_type === 'discount' ? 'bg-red-100 text-red-700' : ''}
                  ${offer.offer_type === 'bundle' ? 'bg-purple-100 text-purple-700' : ''}
                `}>
                  {offer.offer_type.charAt(0).toUpperCase() + offer.offer_type.slice(1)}
                </span>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {offer.title}
                </h3>

                {/* Description */}
                {offer.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {offer.description}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mb-3">
                  {hasDiscount && (
                    <span className="text-sm text-gray-600 line-through">
                      {formatPrice(offer.original_price!)}
                    </span>
                  )}
                  {offer.sale_price !== null && (
                    <span className={`text-lg font-bold ${hasDiscount ? 'text-red-600' : 'text-biz-navy'}`}>
                      {formatPrice(offer.sale_price)}
                    </span>
                  )}
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  {/* Days Remaining */}
                  {daysRemaining !== null && daysRemaining > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                    </div>
                  )}

                  {/* Quantity Remaining */}
                  {offer.quantity_remaining !== null && offer.quantity_total !== null && (
                    <div className="text-gray-500">
                      {offer.quantity_remaining} / {offer.quantity_total} available
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-biz-orange font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    <ShoppingCart className="w-4 h-4" />
                    View Offer Details
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

    </section>
  );
}

export default ListingOffers;
