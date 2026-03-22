/**
 * ListingActivityFeed - Listing-Level Activity Display
 *
 * @description Activity feed for listing-specific events
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/DashboardActivityFeed.tsx
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (STANDARD tier requirement)
 * - Color mapping per activity type
 * - Empty state, loading skeleton, error handling
 *
 * USAGE:
 * Rendered in ListingManagerDashboard to show recent listing-level events.
 */
'use client';

import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingActivityItem } from '../types';

export interface ListingActivityFeedProps {
  /** Activity items to display */
  activities: ListingActivityItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Maximum items to show */
  maxItems?: number;
}

/**
 * Activity item display component
 */
function ActivityItemCard({ activity }: { activity: ListingActivityItem }) {
  const typeColors: Record<string, string> = {
    review: 'border-yellow-200 bg-yellow-50',
    message: 'border-indigo-200 bg-indigo-50',
    view_milestone: 'border-blue-200 bg-blue-50',
    offer_redemption: 'border-green-200 bg-green-50',
    event_rsvp: 'border-orange-200 bg-orange-50',
    follower: 'border-purple-200 bg-purple-50'
  };

  const borderColor = typeColors[activity.type] ?? 'border-gray-200 bg-gray-50';

  // Format timestamp as relative time
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className={`border-l-4 ${borderColor} pl-4 py-3 rounded-r-lg`}>
      <p className="text-gray-900 font-medium text-sm">{activity.title}</p>
      <p className="text-gray-600 text-sm mt-1">{activity.description}</p>
      {activity.actor_name && (
        <p className="text-gray-500 text-xs mt-1">by {activity.actor_name}</p>
      )}
      <p className="text-gray-600 text-xs mt-1">
        {formatTimestamp(activity.created_at)}
      </p>
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

/**
 * Empty state
 */
function EmptyState() {
  return (
    <div className="text-center py-12 text-gray-500">
      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="text-lg font-medium mb-2">No recent activity</p>
      <p className="text-sm">Activity will appear here as customers interact with your listing.</p>
    </div>
  );
}

/**
 * Error state
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-600">
      <AlertCircle className="w-12 h-12 mx-auto mb-4" />
      <p className="text-lg font-medium mb-2">Failed to load activity</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}

/**
 * ListingActivityFeed component content
 */
function ListingActivityFeedContent({
  activities,
  isLoading = false,
  error = null,
  maxItems = 10
}: ListingActivityFeedProps) {
  const displayActivities = maxItems > 0 ? activities.slice(0, maxItems) : activities;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-[#ed6437]" />
          Recent Activity
        </h2>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : displayActivities.length > 0 ? (
          displayActivities.map((activity) => (
            <ActivityItemCard key={activity.id} activity={activity} />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

/**
 * ListingActivityFeed - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function ListingActivityFeed(props: ListingActivityFeedProps) {
  return (
    <ErrorBoundary componentName="ListingActivityFeed">
      <ListingActivityFeedContent {...props} />
    </ErrorBoundary>
  );
}

export default ListingActivityFeed;
