/**
 * OfferCard - Offer/Deal Display Card for Homepage
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Store } from 'lucide-react';
import { OfferCardData } from '../types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';

interface OfferCardProps {
  /** Offer data */
  offer: OfferCardData;
  /** Additional CSS classes */
  className?: string;
  /** Index in grid for LCP optimization */
  index?: number;
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
}

/**
 * OfferCard component
 * Displays offer information in a card format for homepage sliders
 */
export function OfferCard({ offer, className = '', index = 0 }: OfferCardProps) {
  const { priority } = useLCPImagePriority({ layout: 'grid', index });
  const hasDiscount = offer.discount_percentage && offer.discount_percentage > 0;

  return (
    <Link
      href={`/offers/${offer.slug}` as Route}
      className={`flex-shrink-0 w-80 snap-start group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Offer Image */}
        <div className="relative h-36 w-full bg-gray-100">
          {offer.image ? (
            <Image
              src={offer.image}
              alt={offer.title}
              fill
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 320px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
              <span className="text-3xl font-bold text-white">%</span>
            </div>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {offer.discount_percentage}% off
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-biz-navy line-clamp-1 group-hover:text-biz-orange transition-colors">
            {offer.title}
          </h3>

          {/* Business Name */}
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <Store className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{offer.listing_name}</span>
          </p>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 mt-3">
            {offer.original_price !== undefined && offer.sale_price !== undefined ? (
              <>
                <span className="text-sm text-gray-600 line-through">
                  {formatPrice(offer.original_price)}
                </span>
                <span className="text-lg font-bold text-biz-navy">
                  {formatPrice(offer.sale_price)}
                </span>
              </>
            ) : offer.sale_price !== undefined ? (
              <span className="text-lg font-bold text-biz-navy">
                {formatPrice(offer.sale_price)}
              </span>
            ) : hasDiscount ? (
              <span className="text-lg font-bold text-biz-orange">
                {offer.discount_percentage}% OFF
              </span>
            ) : (
              <span className="text-sm text-gray-500">View details</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default OfferCard;
