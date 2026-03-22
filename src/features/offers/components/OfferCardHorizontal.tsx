/**
 * OfferCardHorizontal - Horizontal offer card for list view
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Offer Card Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Horizontal variant of OfferCard for list view display.
 * Shows thumbnail on left, content on right with offer details.
 * Maintains visual consistency with grid OfferCard.
 *
 * @see docs/pages/layouts/offers/phases/PHASE_4_BRAIN_PLAN.md
 * @see src/features/events/components/EventCardHorizontal.tsx - Layout reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Tag, Clock, Star } from 'lucide-react';
import type { OfferWithCoordinates } from '@/features/offers/types';

interface OfferCardHorizontalProps {
  /** Offer data with coordinates */
  offer: OfferWithCoordinates;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate days remaining until offer expires
 */
function getDaysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format price for display with USD currency
 */
function formatPrice(price: number | undefined): string {
  if (price === undefined) return '';
  return `$${Number(price).toFixed(2)}`;
}

/**
 * OfferCardHorizontal component
 * Displays offer information in horizontal card format for list view
 */
export function OfferCardHorizontal({ offer, className = '' }: OfferCardHorizontalProps) {
  const daysRemaining = getDaysRemaining(offer.end_date);
  const hasDiscount = offer.discount_percentage !== undefined && offer.discount_percentage > 0;

  return (
    <Link
      href={`/offers/${offer.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        {/* Thumbnail Container */}
        <div className="relative w-full sm:w-32 md:w-40 h-32 sm:h-auto sm:min-h-[120px] flex-shrink-0 bg-gray-100">
          {offer.image || offer.thumbnail ? (
            <Image
              src={offer.image || offer.thumbnail || ''}
              alt={offer.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 160px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-orange to-orange-700">
              <Tag className="w-8 h-8 text-white" />
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-2 left-2 bg-biz-orange text-white text-xs font-medium px-2 py-1 rounded-full">
              -{offer.discount_percentage}%
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between">
          <div>
            {/* Listing Name */}
            {offer.listing_name && (
              <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
                {offer.listing_name}
              </span>
            )}

            {/* Offer Title */}
            <h3 className="font-semibold text-biz-navy text-base sm:text-lg mt-1 group-hover:text-biz-orange transition-colors line-clamp-2">
              {offer.title}
            </h3>

            {/* Price Display */}
            {(offer.original_price !== undefined || offer.sale_price !== undefined) && (
              <div className="flex items-center gap-2 mt-2">
                {offer.original_price !== undefined && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(offer.original_price)}
                  </span>
                )}
                {offer.sale_price !== undefined && (
                  <span className="text-base font-bold text-biz-navy">
                    {formatPrice(offer.sale_price)} USD
                  </span>
                )}
              </div>
            )}

            {/* Days Remaining */}
            <p className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="line-clamp-1">
                {daysRemaining === 0 ? 'Ends today' : daysRemaining === 1 ? 'Ends tomorrow' : `${daysRemaining} days left`}
              </span>
            </p>
          </div>

          {/* Footer - Featured Indicator */}
          {offer.is_featured && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="flex items-center gap-1 text-xs font-medium text-yellow-600">
                <Star className="w-3 h-3 fill-current" />
                Featured Offer
              </p>
            </div>
          )}

          {/* Quantity Warning */}
          {offer.quantity_remaining !== undefined && offer.quantity_remaining > 0 && offer.quantity_remaining <= 10 && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              Only {offer.quantity_remaining} remaining
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export default OfferCardHorizontal;
