/**
 * OfferComparisonPanel - Offer Performance Comparison Table
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Offers Phase 2 - Orphaned Routes + Hook Triggers
 * @governance Build Map v2.1 ENHANCED
 *
 * Displays ranked offer performance comparison for a listing.
 * Uses useOfferComparison hook for data fetching.
 */
'use client';

import { RefreshCw, Loader2, AlertCircle, BarChart2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useOfferComparison } from '@features/offers/hooks/useOfferComparison';
import type { OfferComparison, OfferStatus } from '@features/offers/types';

// ============================================================================
// TYPES
// ============================================================================

interface OfferComparisonPanelProps {
  listingId: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadgeClass(status: OfferStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'paused':
      return 'bg-yellow-100 text-yellow-700';
    case 'expired':
      return 'bg-gray-100 text-gray-600';
    case 'sold_out':
      return 'bg-red-100 text-red-700';
    case 'draft':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Top 50%';
  return 'Bottom 50%';
}

function getPercentileBadgeClass(percentile: number): string {
  if (percentile >= 90) return 'bg-[#ed6437] text-white';
  if (percentile >= 75) return 'bg-orange-100 text-orange-700';
  if (percentile >= 50) return 'bg-gray-100 text-gray-700';
  return 'bg-gray-50 text-gray-500';
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ============================================================================
// INNER COMPONENT
// ============================================================================

function OfferComparisonPanelContent({ listingId }: OfferComparisonPanelProps) {
  const { comparisons, isLoading, error, refresh } = useOfferComparison(listingId);

  return (
    <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#ed6437]" />
          <h3 className="text-lg font-semibold text-gray-900">
            Offer Performance Comparison
          </h3>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          aria-label="Refresh comparison data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-medium">Failed to load comparison</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && comparisons.length === 0 && (
        <div className="text-center py-10">
          <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No offers to compare yet. Create at least 2 active offers.
          </p>
        </div>
      )}

      {/* Comparison table */}
      {!isLoading && !error && comparisons.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Rank
                </th>
                <th className="text-left pb-3 pr-4 font-medium text-gray-500">
                  Offer Title
                </th>
                <th className="text-left pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Status
                </th>
                <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Impressions
                </th>
                <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Claims
                </th>
                <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Redemptions
                </th>
                <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Claim Rate
                </th>
                <th className="text-right pb-3 pr-4 font-medium text-gray-500 whitespace-nowrap">
                  Redeem Rate
                </th>
                <th className="text-right pb-3 font-medium text-gray-500 whitespace-nowrap">
                  Percentile
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comparisons.map((item: OfferComparison) => {
                const isTopRank = item.rank === 1;
                return (
                  <tr
                    key={item.offerId}
                    className={`transition-colors ${isTopRank ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Rank */}
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          isTopRank
                            ? 'bg-[#ed6437] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.rank}
                      </span>
                    </td>

                    {/* Offer Title */}
                    <td className="py-3 pr-4">
                      <span className="font-medium text-gray-900 line-clamp-1">
                        {item.title}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Impressions */}
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {item.metrics.impressions.toLocaleString()}
                    </td>

                    {/* Claims */}
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {item.metrics.claims.toLocaleString()}
                    </td>

                    {/* Redemptions */}
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {item.metrics.redemptions.toLocaleString()}
                    </td>

                    {/* Claim Rate */}
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {formatPercent(item.metrics.claimConversionRate)}
                    </td>

                    {/* Redemption Rate */}
                    <td className="py-3 pr-4 text-right text-gray-700">
                      {formatPercent(item.metrics.redemptionRate)}
                    </td>

                    {/* Percentile */}
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getPercentileBadgeClass(
                          item.percentile
                        )}`}
                      >
                        {getPercentileLabel(item.percentile)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT (with ErrorBoundary)
// ============================================================================

export function OfferComparisonPanel({ listingId }: OfferComparisonPanelProps) {
  return (
    <ErrorBoundary componentName="OfferComparisonPanel">
      <OfferComparisonPanelContent listingId={listingId} />
    </ErrorBoundary>
  );
}

export default OfferComparisonPanel;
