/**
 * GroupActivityFeed Component
 * Activity stream for a connection group
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - ErrorBoundary wrapper (MANDATORY)
 * - Uses GroupActivityItem
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionGroupsPanel.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Loader2, ChevronDown } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GroupActivityItem } from './GroupActivityItem';
import type { GroupActivity } from '../types/group-actions';

export interface GroupActivityFeedProps {
  groupId: number;
  limit?: number;
  className?: string;
}

const DEFAULT_LIMIT = 20;
const PAGE_SIZE = 20;

function GroupActivityFeedContent({
  groupId,
  limit = DEFAULT_LIMIT,
  className = ''
}: GroupActivityFeedProps) {
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const loadActivities = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const currentOffset = loadMore ? offset : 0;
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset)
      });

      const response = await fetch(
        `/api/users/connections/groups/${groupId}/activity?${params}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success && result.data) {
        const newActivities: GroupActivity[] = result.data.activities || [];

        if (loadMore) {
          setActivities((prev) => [...prev, ...newActivities]);
        } else {
          setActivities(newActivities);
        }

        setHasMore(newActivities.length === PAGE_SIZE);
        setOffset(currentOffset + newActivities.length);
      }
    } catch {
      setError('Failed to load activity');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [groupId, offset]);

  useEffect(() => {
    void loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      void loadActivities(true);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              setOffset(0);
              void loadActivities();
            }}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <Activity className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No activity yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Activity will appear here as members interact
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </h2>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-100 px-4">
        {activities.slice(0, limit).map((activity) => (
          <GroupActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Load More */}
      {hasMore && activities.length >= limit && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load more activity
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function GroupActivityFeed(props: GroupActivityFeedProps) {
  return (
    <ErrorBoundary
      componentName="GroupActivityFeed"
      fallback={
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm">
          <p>Unable to load activity feed.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
      <GroupActivityFeedContent {...props} />
    </ErrorBoundary>
  );
}
