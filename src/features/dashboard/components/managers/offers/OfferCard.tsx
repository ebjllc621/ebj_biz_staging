/**
 * OfferCard - Offer Display Card
 *
 * @description Individual offer card with edit/delete actions
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme for action buttons (#ed6437)
 * - Displays pricing, dates, quantity, status
 */
'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, DollarSign, Package, Calendar, Star, BarChart2, FlaskConical } from 'lucide-react';
import { ABTestSetupModal } from './ABTestSetupModal';

// ============================================================================
// TYPES
// ============================================================================

interface Offer {
  id: number;
  title: string;
  description: string | null;
  offer_type: 'product' | 'service' | 'discount' | 'bundle';
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  quantity_total: number | null;
  quantity_sold: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'expired' | 'sold_out';
  is_featured: boolean;
  image_url: string | null;
}

export interface OfferCardProps {
  /** Offer data */
  offer: Offer;
  /** Edit callback */
  onEdit: () => void;
  /** Delete callback */
  onDelete: () => void;
  /** View analytics callback (optional) */
  onViewAnalytics?: () => void;
  /** Can use A/B testing (tier-gated) */
  canABTest?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * OfferCard - Offer display card
 *
 * @param offer - Offer data
 * @param onEdit - Edit callback
 * @param onDelete - Delete callback
 * @returns Offer card
 */
export function OfferCard({ offer, onEdit, onDelete, onViewAnalytics, canABTest }: OfferCardProps) {
  const [showABTestModal, setShowABTestModal] = useState(false);

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-700',
    sold_out: 'bg-red-100 text-red-700'
  };

  const offerTypeLabels = {
    product: 'Product',
    service: 'Service',
    discount: 'Discount',
    bundle: 'Bundle'
  };

  // Parse prices (MariaDB returns decimals as strings)
  const originalPrice = offer.original_price ? parseFloat(String(offer.original_price)) : null;
  const discountedPrice = offer.discounted_price ? parseFloat(String(offer.discounted_price)) : null;

  // Calculate savings
  const savings = originalPrice && discountedPrice
    ? originalPrice - discountedPrice
    : null;

  const savingsPercentage = savings && originalPrice
    ? Math.round((savings / originalPrice) * 100)
    : offer.discount_percentage;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header: Title + Status + Actions */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {offer.title}
            </h3>
            {offer.is_featured && (
              <Star className="w-4 h-4 text-[#ed6437] fill-[#ed6437]" aria-label="Featured" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[offer.status]}`}>
              {offer.status === 'sold_out' ? 'Sold Out' : offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </span>
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
              {offerTypeLabels[offer.offer_type]}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onViewAnalytics && (
            <button
              onClick={onViewAnalytics}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="View share analytics"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          )}
          {canABTest && (
            <button
              onClick={() => setShowABTestModal(true)}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Run A/B test"
            >
              <FlaskConical className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-[#ed6437] hover:bg-gray-100 rounded transition-colors"
            title="Edit offer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete offer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      {offer.description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {offer.description}
        </p>
      )}

      {/* Offer Details */}
      <div className="space-y-2">
        {/* Pricing */}
        {(originalPrice || discountedPrice) && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="flex items-center gap-2">
              {discountedPrice && (
                <span className="text-[#ed6437] font-semibold">
                  ${discountedPrice.toFixed(2)}
                </span>
              )}
              {originalPrice && (
                <span className={discountedPrice ? 'text-gray-500 line-through' : 'text-gray-900 font-semibold'}>
                  ${originalPrice.toFixed(2)}
                </span>
              )}
              {savingsPercentage && (
                <span className="bg-[#ed6437] text-white px-2 py-0.5 rounded text-xs font-medium">
                  {savingsPercentage}% OFF
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quantity */}
        {offer.quantity_total && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>
              {offer.quantity_sold} / {offer.quantity_total} sold
            </span>
          </div>
        )}

        {/* Dates */}
        {(offer.start_date || offer.end_date) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              {offer.start_date && new Date(offer.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {offer.start_date && offer.end_date && ' - '}
              {offer.end_date && new Date(offer.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* A/B Test Modal */}
      {canABTest && (
        <ABTestSetupModal
          isOpen={showABTestModal}
          onClose={() => setShowABTestModal(false)}
          offerId={offer.id}
          currentTitle={offer.title}
          currentImage={offer.image_url || undefined}
          onSuccess={() => {
            setShowABTestModal(false);
          }}
        />
      )}
    </div>
  );
}

export default OfferCard;
