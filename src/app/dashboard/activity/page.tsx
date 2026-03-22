/**
 * Dashboard Activity Log Page
 * Full activity history with pagination and filtering
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/dashboard/components/DashboardActivityFeed.tsx
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardActivityItem } from '@features/dashboard/types';

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Activity type color mapping
 */
const typeColors: Record<string, string> = {
  connection: 'border-purple-200 bg-purple-50 text-purple-700',
  review: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  listing: 'border-blue-200 bg-blue-50 text-blue-700',
  offer: 'border-green-200 bg-green-50 text-green-700',
  event: 'border-orange-200 bg-orange-50 text-orange-700',
  message: 'border-indigo-200 bg-indigo-50 text-indigo-700'
};

/**
 * Activity type labels
 */
const typeLabels: Record<string, string> = {
  connection: 'Connection',
  review: 'Review',
  listing: 'Listing',
  offer: 'Offer',
  event: 'Event',
  message: 'Message'
};

/**
 * Format timestamp as relative time
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: days > 365 ? 'numeric' : undefined
    });
  }
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

/**
 * Activity item card component
 */
function ActivityLogItem({ activity }: { activity: DashboardActivityItem }) {
  const colorClass = typeColors[activity.type] ?? 'border-gray-200 bg-gray-50 text-gray-700';
  const typeLabel = typeLabels[activity.type] ?? activity.type;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
              {typeLabel}
            </span>
            <span className="text-gray-600 text-xs">
              {formatTimestamp(activity.created_at)}
            </span>
          </div>
          <h3 className="text-gray-900 font-medium text-sm">{activity.title}</h3>
          <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
          {activity.actor_name && (
            <p className="text-gray-500 text-xs mt-2">by {activity.actor_name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-20 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-full bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
      <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        Your activity log will show connections, messages, and other interactions
        as you use the platform. Start connecting with professionals to see activity here!
      </p>
    </div>
  );
}

/**
 * Pagination controls
 */
function Pagination({
  pagination,
  onPageChange,
  isLoading
}: {
  pagination: PaginationInfo;
  onPageChange: (offset: number) => void;
  isLoading: boolean;
}) {
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 mt-4">
      <div className="text-sm text-gray-600">
        Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
          disabled={pagination.offset === 0 || isLoading}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-[80px] text-center">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(pagination.offset + pagination.limit)}
          disabled={!pagination.has_more || isLoading}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Activity Log page content
 */
function ActivityLogContent() {
  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch activities
  const fetchActivities = useCallback(async (offset: number = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/dashboard/activity?limit=20&offset=${offset}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load activity log');
      }

      const result = await response.json();
      setActivities(result.data.items);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Handle page change
  const handlePageChange = (offset: number) => {
    fetchActivities(offset);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchActivities(pagination.offset);
  };

  // Filter activities by type
  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type === filterType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-green-600" />
            Activity Log
          </h1>
          <p className="text-gray-600 mt-1">Your complete activity history</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">Filter by type:</span>
        <div className="flex flex-wrap gap-2">
          {['all', 'connection', 'message', 'review', 'listing', 'event', 'offer'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === type
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={handleRefresh}
            className="ml-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Activity list */}
      {isLoading && activities.length === 0 ? (
        <LoadingSkeleton />
      ) : filteredActivities.length > 0 ? (
        <>
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <ActivityLogItem key={activity.id} activity={activity} />
            ))}
          </div>
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </>
      ) : (
        <EmptyState />
      )}

      {/* Stats summary */}
      {pagination.total > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-600">
          Total activity records: <span className="font-medium text-gray-900">{pagination.total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Activity Log Page - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export default function ActivityPage() {
  return (
    <ErrorBoundary componentName="DashboardActivityLogPage">
      <ActivityLogContent />
    </ErrorBoundary>
  );
}
