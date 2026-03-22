/**
 * FollowersManager - Listing Followers Manager
 *
 * @description Display and manage users who have bookmarked the listing
 * @component Client Component
 * @tier STANDARD
 * @generated FIXFLOW - Phase 9 Remediation
 * @phase Phase 9 - Communication/Reputation Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_9_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for accent elements
 *
 * DATA ISOLATION: Shows users who bookmarked THIS listing,
 * NOT listings the user bookmarked.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, AlertCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { EmptyState } from '../shared/EmptyState';

// ============================================================================
// TYPES
// ============================================================================

interface Follower {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bookmarked_at: string;
  notes: string | null;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function FollowerCard({ follower }: { follower: Follower }) {
  const displayName = follower.first_name && follower.last_name
    ? `${follower.first_name} ${follower.last_name}`
    : follower.first_name || follower.last_name || 'Anonymous User';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {follower.avatar_url ? (
          <img
            src={follower.avatar_url}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ed6437] to-[#d55a31] flex items-center justify-center text-white font-semibold">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{displayName}</h3>
          <p className="text-sm text-gray-500 truncate">{follower.email}</p>
          <p className="text-xs text-gray-400 mt-1">
            Following since {new Date(follower.bookmarked_at).toLocaleDateString()}
          </p>
        </div>

        {/* Action */}
        <a
          href={`/profile/${follower.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-[#ed6437] border border-gray-200 rounded-lg hover:border-[#ed6437] transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </a>
      </div>

      {/* Notes */}
      {follower.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 italic">&ldquo;{follower.notes}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

function FollowersSummary({ total, recent }: { total: number; recent: number }) {
  return (
    <div className="bg-gradient-to-r from-[#ed6437] to-[#d55a31] rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80">Total Followers</div>
          <div className="text-4xl font-bold mt-1">{total}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <TrendingUp className="w-4 h-4" />
            Last 30 days
          </div>
          <div className="text-2xl font-semibold mt-1">+{recent}</div>
        </div>
        <Users className="w-16 h-16 opacity-20" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function FollowersManagerContent() {
  const { selectedListingId } = useListingContext();

  // State
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Fetch followers
  const fetchFollowers = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/listings/${selectedListingId}/followers?page=${page}&limit=${limit}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch followers');
      }

      const result = await response.json();
      if (result.success) {
        setFollowers(result.data?.data || result.data || []);
        setTotal(result.data?.pagination?.total || 0);
        setTotalPages(result.data?.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load followers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, page]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  // Calculate recent followers (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentCount = followers.filter(
    (f) => new Date(f.bookmarked_at) >= thirtyDaysAgo
  ).length;

  // Loading state
  if (isLoading && followers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Followers</h2>
        <p className="text-sm text-gray-600 mt-1">
          Users who have bookmarked your listing
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary */}
      {total > 0 && <FollowersSummary total={total} recent={recentCount} />}

      {/* Followers Grid */}
      {followers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Followers Yet"
          description="When users bookmark your listing, they'll appear here. Promote your listing to attract more followers!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followers.map((follower) => (
            <FollowerCard key={follower.id} follower={follower} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * FollowersManager - Wrapped with ErrorBoundary
 */
export function FollowersManager() {
  return (
    <ErrorBoundary componentName="FollowersManager">
      <FollowersManagerContent />
    </ErrorBoundary>
  );
}

export default FollowersManager;
