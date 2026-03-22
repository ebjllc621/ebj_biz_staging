/**
 * BundleDetailHero - Hero section for bundle detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { Package, Tag, Clock, CheckCircle, Users } from 'lucide-react';
import type { OfferBundle } from '@features/offers/types';

interface BundleDetailHeroProps {
  bundle: OfferBundle;
  totalSavings?: number;
  className?: string;
}

export function BundleDetailHero({
  bundle,
  totalSavings,
  className = '',
}: BundleDetailHeroProps) {
  const isActive = bundle.status === 'active';
  const endDate = bundle.end_date ? new Date(bundle.end_date) : null;
  const isExpired = endDate && endDate < new Date();

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
          Expired
        </span>
      );
    }
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
          Inactive
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        Active
      </span>
    );
  };

  return (
    <div className={`bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white ${className}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{bundle.name}</h1>
            <p className="text-purple-200 mt-1">{bundle.description}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-200 text-sm mb-1">
            <Tag className="w-4 h-4" />
            Offers Included
          </div>
          <p className="text-2xl font-bold">{bundle.offers?.length || 0}</p>
        </div>

        {totalSavings !== undefined && totalSavings > 0 && (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-200 text-sm mb-1">
              <Tag className="w-4 h-4" />
              Total Savings
            </div>
            <p className="text-2xl font-bold">${totalSavings.toFixed(2)}</p>
          </div>
        )}

        {bundle.claims_count !== undefined && (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-200 text-sm mb-1">
              <Users className="w-4 h-4" />
              Times Claimed
            </div>
            <p className="text-2xl font-bold">{bundle.claims_count}</p>
          </div>
        )}

        {endDate && !isExpired && (
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-purple-200 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Expires
            </div>
            <p className="text-lg font-bold">
              {endDate.toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
