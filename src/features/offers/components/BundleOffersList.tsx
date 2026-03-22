/**
 * BundleOffersList - List of offers within a bundle
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Tag, Clock, CheckCircle } from 'lucide-react';
import type { Offer } from '@features/offers/types';

interface BundleOffersListProps {
  offers: Offer[];
  claimedOfferIds?: number[];
  onOfferClick?: (offer: Offer) => void;
  className?: string;
}

export function BundleOffersList({
  offers,
  claimedOfferIds = [],
  onOfferClick,
  className = '',
}: BundleOffersListProps) {
  if (!offers.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No offers in this bundle</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900">
        Included Offers ({offers.length})
      </h2>

      <div className="grid gap-4">
        {offers.map((offer) => {
          const isClaimed = claimedOfferIds.includes(offer.id);
          const endDate = offer.end_date ? new Date(offer.end_date) : null;
          const isExpired = endDate && endDate < new Date();

          return (
            <div
              key={offer.id}
              onClick={() => onOfferClick?.(offer)}
              className={`p-4 bg-white border rounded-xl transition-all ${
                onOfferClick ? 'cursor-pointer hover:shadow-md hover:border-purple-300' : ''
              } ${isClaimed ? 'border-green-200 bg-green-50' : 'border-gray-200'} ${
                isExpired ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{offer.title}</h3>
                    {isClaimed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Claimed
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                        Expired
                      </span>
                    )}
                  </div>

                  {offer.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {offer.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {endDate && !isExpired && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Expires {endDate.toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Discount Display */}
                <div className="flex-shrink-0 ml-4">
                  {offer.discount_percentage && (
                    <div className="text-right">
                      <span className="text-2xl font-bold text-purple-600">
                        {offer.discount_percentage}%
                      </span>
                      <p className="text-xs text-gray-500">OFF</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
