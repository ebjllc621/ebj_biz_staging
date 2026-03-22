/**
 * BundleCard - Card component for bundle directory
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import Link from 'next/link';
import { Package, ArrowRight, Tag, Clock } from 'lucide-react';
import type { OfferBundle } from '@features/offers/types';

interface BundleCardProps {
  bundle: OfferBundle;
}

export function BundleCard({ bundle }: BundleCardProps) {
  const savings = bundle.total_value && bundle.bundle_price
    ? Math.round(((bundle.total_value - bundle.bundle_price) / bundle.total_value) * 100)
    : 0;

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Free';
    return `$${Number(price).toFixed(2)}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isExpiring = new Date(bundle.end_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link
      href={`/bundles/${bundle.slug}` as any}
      className="group block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">
              {bundle.offers?.length || 0} offers
            </span>
          </div>
          {savings > 0 && (
            <span className="bg-white text-purple-700 px-2 py-0.5 rounded-full text-sm font-bold">
              -{savings}%
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold mt-2 group-hover:underline">{bundle.name}</h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {bundle.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {bundle.description}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(bundle.bundle_price)}
          </span>
          {bundle.total_value && bundle.total_value > (bundle.bundle_price || 0) && (
            <span className="text-gray-400 line-through text-sm">
              {formatPrice(bundle.total_value)}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className={isExpiring ? 'text-orange-600' : ''}>
              Until {formatDate(bundle.end_date)}
            </span>
          </div>
          <span>
            {bundle.claims_count} claimed
            {bundle.max_claims && <span> / {bundle.max_claims}</span>}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-end text-purple-600 font-medium group-hover:text-purple-700">
          View Details
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
