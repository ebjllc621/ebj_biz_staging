/**
 * FlashOfferCard - Card variant with urgency styling for flash offers
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import Link from 'next/link';
import { Zap, Clock, Tag } from 'lucide-react';
import FlashOfferCountdown from './FlashOfferCountdown';
import type { Offer } from '@features/offers/types';

interface FlashOfferCardProps {
  offer: Offer & {
    flash_end_time?: string;
    flash_urgency_level?: 'normal' | 'high' | 'critical';
    listing_name?: string;
  };
}

export function FlashOfferCard({ offer }: FlashOfferCardProps) {
  const urgencyLevel = offer.flash_urgency_level || 'normal';

  const urgencyStyles = {
    normal: {
      bg: 'bg-orange-500',
      border: 'border-orange-300',
      text: 'text-orange-700',
      gradient: 'from-orange-500 to-yellow-500',
    },
    high: {
      bg: 'bg-red-500',
      border: 'border-red-300',
      text: 'text-red-700',
      gradient: 'from-red-500 to-orange-500',
    },
    critical: {
      bg: 'bg-red-600',
      border: 'border-red-400',
      text: 'text-red-800',
      gradient: 'from-red-600 to-red-500',
    },
  };

  const styles = urgencyStyles[urgencyLevel];

  const formatPrice = (price: number | null): string => {
    if (price === null) return '';
    return `$${Number(price).toFixed(2)}`;
  };

  return (
    <Link
      href={`/offers/${offer.slug}` as any}
      className={`group block bg-white rounded-xl shadow-md border-2 ${styles.border} overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1`}
    >
      {/* Flash Badge Header */}
      <div className={`bg-gradient-to-r ${styles.gradient} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-white">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="font-bold text-sm">FLASH DEAL</span>
        </div>
        <div className="flex items-center gap-1 text-white text-sm">
          <Clock className="w-3 h-3" />
          <FlashOfferCountdown
            endDate={new Date(offer.end_date)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Image */}
      {offer.image && (
        <div className="relative h-40 bg-gray-100 overflow-hidden">
          <img
            src={offer.image}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {offer.discount_percentage && (
            <div className={`absolute top-2 right-2 ${styles.bg} text-white px-2 py-1 rounded-full text-sm font-bold`}>
              -{offer.discount_percentage}%
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-orange-600 transition-colors">
          {offer.title}
        </h3>
        {offer.listing_name && (
          <p className="text-sm text-gray-500 mb-2">{offer.listing_name}</p>
        )}

        {/* Pricing */}
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-400" />
          {offer.sale_price && (
            <span className={`text-lg font-bold ${styles.text}`}>
              {formatPrice(offer.sale_price)}
            </span>
          )}
          {offer.original_price && offer.sale_price && (
            <span className="text-gray-400 line-through text-sm">
              {formatPrice(offer.original_price)}
            </span>
          )}
        </div>

        {/* Urgency Indicator */}
        {urgencyLevel === 'critical' && (
          <div className="flex items-center gap-2 text-red-600 text-sm animate-pulse">
            <Zap className="w-4 h-4" />
            <span className="font-medium">Almost gone!</span>
          </div>
        )}
        {urgencyLevel === 'high' && (
          <div className="flex items-center gap-2 text-orange-600 text-sm">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Ending soon!</span>
          </div>
        )}
      </div>
    </Link>
  );
}
