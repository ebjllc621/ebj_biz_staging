/**
 * GroupBidComparisonPanel Component
 * Compare bids from group members for a specific quote with a sortable table
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines) with ErrorBoundary
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 3B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { TrendingDown, TrendingUp, Users, Loader2, BarChart2 } from 'lucide-react';
import type { GroupBidComparison, QuotePoolMemberBid } from '../types/groups';

export interface GroupBidComparisonPanelProps {
  groupId: number;
  quoteId: number;
  quoteName?: string;
}

type SortKey = 'bidAmount' | 'memberName' | 'submittedAt' | 'status';
type SortDir = 'asc' | 'desc';

function formatCurrency(amount: number | null): string {
  if (amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function GroupBidComparisonPanelContent({
  groupId,
  quoteId
}: GroupBidComparisonPanelProps) {
  const [comparison, setComparison] = useState<GroupBidComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('bidAmount');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    void loadComparison();
  }, [groupId, quoteId]);

  const loadComparison = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/users/connections/groups/${groupId}/quote-pool/bids?quoteId=${quoteId}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load bid comparison');
      }

      setComparison(result.data.comparison as GroupBidComparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedBids = (comparison?.bids ?? []).slice().sort((a: QuotePoolMemberBid, b: QuotePoolMemberBid) => {
    let aVal: string | number | Date = a[sortKey] ?? '';
    let bVal: string | number | Date = b[sortKey] ?? '';

    if (sortKey === 'bidAmount') {
      aVal = a.bidAmount ?? Infinity;
      bVal = b.bidAmount ?? Infinity;
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => void loadComparison()}
          className="mt-2 text-xs text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!comparison) return null;

  const SortIcon = ({ field }: { field: SortKey }) =>
    sortKey === field ? (
      sortDir === 'asc' ? (
        <TrendingDown className="w-3 h-3 inline ml-1" />
      ) : (
        <TrendingUp className="w-3 h-3 inline ml-1" />
      )
    ) : null;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Lowest Bid</p>
          <p className="text-lg font-bold text-green-700">
            {formatCurrency(comparison.lowestBid)}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Average Bid</p>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(comparison.averageBid)}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Highest Bid</p>
          <p className="text-lg font-bold text-orange-700">
            {formatCurrency(comparison.highestBid)}
          </p>
        </div>
      </div>

      {/* Response Summary */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span>
          {comparison.totalResponses} response{comparison.totalResponses !== 1 ? 's' : ''} from{' '}
          {comparison.totalMembers} member{comparison.totalMembers !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bids Table */}
      {sortedBids.length === 0 ? (
        <div className="text-center py-8">
          <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No bids submitted yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Group members haven't responded to this quote request yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th
                  className="text-left py-2 px-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('memberName')}
                >
                  Member <SortIcon field="memberName" />
                </th>
                <th
                  className="text-left py-2 px-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('bidAmount')}
                >
                  Bid Amount <SortIcon field="bidAmount" />
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  Duration
                </th>
                <th
                  className="text-left py-2 px-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBids.map((bid, idx) => (
                <tr
                  key={`${bid.memberId}-${idx}`}
                  className={`border-b border-gray-100 ${
                    bid.bidAmount === comparison.lowestBid && bid.bidAmount !== null
                      ? 'bg-green-50'
                      : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <p className="font-medium text-gray-900">{bid.memberName}</p>
                    {bid.listingName && (
                      <p className="text-xs text-gray-500">{bid.listingName}</p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-semibold ${
                        bid.bidAmount === comparison.lowestBid && bid.bidAmount !== null
                          ? 'text-green-700'
                          : 'text-gray-900'
                      }`}
                    >
                      {formatCurrency(bid.bidAmount)}
                    </span>
                    {bid.bidAmount === comparison.lowestBid && bid.bidAmount !== null && (
                      <span className="ml-1 text-xs text-green-600 font-medium">Best</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    {bid.estimatedDuration || '-'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        bid.status === 'accepted'
                          ? 'bg-green-100 text-green-700'
                          : bid.status === 'rejected' || bid.status === 'withdrawn'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {bid.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function GroupBidComparisonPanel(props: GroupBidComparisonPanelProps) {
  return (
    <ErrorBoundary
      componentName="GroupBidComparisonPanel"
      fallback={
        <div className="p-4 bg-red-50 rounded-lg text-sm text-red-600">
          Error loading bid comparison. Please refresh.
        </div>
      }
    >
      <GroupBidComparisonPanelContent {...props} />
    </ErrorBoundary>
  );
}
