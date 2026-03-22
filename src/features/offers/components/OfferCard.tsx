/**
 * OfferCard - Grid view offer card for Offers page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Offer Card Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Grid variant of offer card extending EventCard pattern.
 * Displays offer information with image, discount badge, pricing, and key details.
 * Includes discount percentage badge, featured indicator, and days remaining.
 *
 * @see docs/pages/layouts/offers/phases/PHASE_4_BRAIN_PLAN.md
 * @see src/features/events/components/EventCard.tsx - Pattern reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Tag, Clock, Star } from 'lucide-react';
import type { OfferWithCoordinates } from '@/features/offers/types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';
import SocialProofBadge from './SocialProofBadge';
import { TrendingBadge } from './TrendingBadge';

interface OfferCardProps {
  /** Offer data with coordinates */
  offer: OfferWithCoordinates;
  /** Additional CSS classes */
  className?: string;
  /** Index in grid for LCP optimization */
  index?: number;
  /** Optional social proof data (fetched by parent) */
  socialProof?: {
    claimsToday: number;
    isTrending: boolean;
  };
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
 * OfferCard component
 * Displays offer information in a card format for grid view
 */
export function OfferCard({ offer, className = '', index = 0, socialProof }: OfferCardProps) {
  const { priority } = useLCPImagePriority({ layout: 'grid', index });
  const daysRemaining = getDaysRemaining(offer.end_date);
  const hasDiscount = offer.discount_percentage !== undefined && offer.discount_percentage > 0;

  return (
    <Link
      href={`/offers/${offer.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Offer Image */}
        <div className="relative h-40 w-full bg-gray-100">
          {offer.image || offer.thumbnail ? (
            <Image
              src={offer.image || offer.thumbnail || ''}
              alt={offer.title}
              fill
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-orange to-orange-700">
              <Tag className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
              -{offer.discount_percentage}%
            </span>
          )}

          {/* Featured Badge */}
          {offer.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}

          {/* Social Proof Badges */}
          {socialProof && socialProof.isTrending && (
            <div className="absolute bottom-3 left-3">
              <TrendingBadge variant="compact" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Listing Name */}
          {offer.listing_name && (
            <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
              {offer.listing_name}
            </span>
          )}

          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
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
            <Clock className="w-3.5 h-3.5" />
            <span>
              {daysRemaining === 0 ? 'Ends today' : daysRemaining === 1 ? 'Ends tomorrow' : `${daysRemaining} days left`}
            </span>
          </p>

          {/* Quantity Remaining */}
          {offer.quantity_remaining !== undefined && offer.quantity_remaining > 0 && offer.quantity_remaining <= 10 && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              Only {offer.quantity_remaining} remaining
            </p>
          )}

          {/* Social Proof */}
          {socialProof && socialProof.claimsToday > 0 && (
            <SocialProofBadge
              claimsToday={socialProof.claimsToday}
              trending={socialProof.isTrending}
              className="mt-2"
            />
          )}
        </div>
      </article>
    </Link>
  );
}

export default OfferCard;
