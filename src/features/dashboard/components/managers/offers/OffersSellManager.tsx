/**
 * OffersSellManager - Sell via Offers Dashboard
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Offers Phase 2 - Orphaned Routes + Hook Triggers
 * @governance Build Map v2.1 ENHANCED
 *
 * Shows offer sell-through data: quantities sold, claims, and redemptions.
 * Read-only display — not a full CRUD interface.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle, Tag, ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';

// ============================================================================
// TYPES
// ============================================================================

interface OfferSellRow {
  id: number;
  title: string;
  quantity_sold: number;
  quantity_total: number | null;
  status: string;
}

interface OffersApiResponse {
  success: boolean;
  data: {
    data: OfferSellRow[];
  };
}

// ============================================================================
// INNER COMPONENT
// ============================================================================

function OffersSellManagerContent() {
  const { selectedListingId } = useListingContext();
  const [offers, setOffers] = useState<OfferSellRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/offers?listingId=${selectedListingId}&limit=100`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const result: OffersApiResponse = await response.json();
      if (result.success) {
        setOffers(result.data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-700 font-medium">Failed to load offers</p>
          <p className="text-sm text-red-600 mt-0.5">{error}</p>
          <button
            onClick={fetchOffers}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-gray-900 mb-2">No offers yet.</h3>
        <p className="text-sm text-gray-500 mb-6">
          Create offers to start tracking sell-through performance.
        </p>
        <Link
          href="../offers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Offers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Track how customers claim and redeem your offers.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-3 pr-4 font-medium text-gray-500">
                Offer Title
              </th>
              <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                Qty Sold
              </th>
              <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                Qty Total
              </th>
              <th className="text-right pb-3 font-medium text-gray-500 whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-medium text-gray-900">{offer.title}</span>
                </td>
                <td className="py-3 pr-4 text-right text-gray-700">
                  {offer.quantity_sold.toLocaleString()}
                </td>
                <td className="py-3 pr-4 text-right text-gray-700">
                  {offer.quantity_total !== null
                    ? offer.quantity_total.toLocaleString()
                    : <span className="text-gray-400">Unlimited</span>}
                </td>
                <td className="py-3 text-right">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      offer.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : offer.status === 'sold_out'
                        ? 'bg-red-100 text-red-700'
                        : offer.status === 'expired'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {offer.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (with ErrorBoundary)
// ============================================================================

export function OffersSellManager() {
  return (
    <ErrorBoundary componentName="OffersSellManager">
      <OffersSellManagerContent />
    </ErrorBoundary>
  );
}

export default OffersSellManager;
