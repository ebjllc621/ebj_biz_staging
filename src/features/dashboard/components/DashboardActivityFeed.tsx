/**
 * DashboardActivityFeed - Recent Activity Display
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/homepage/components/AuthenticatedHomeView.tsx (lines 284-313)
 */
'use client';

import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Activity, ArrowRight } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardActivityItem } from '../types';

export interface DashboardActivityFeedProps {
  /** Activity items to display */
  activities: DashboardActivityItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Maximum items to show */
  maxItems?: number;
  /** Show "View All" link */
  showViewAll?: boolean;
}

/**
 * Activity item display component
 */
function ActivityItemCard({ activity }: { activity: DashboardActivityItem }) {
  const typeColors: Record<string, string> = {
    connection: 'border-purple-200 bg-purple-50',
    review: 'border-yellow-200 bg-yellow-50',
    listing: 'border-blue-200 bg-blue-50',
    offer: 'border-green-200 bg-green-50',
    event: 'border-orange-200 bg-orange-50',
    message: 'border-indigo-200 bg-indigo-50'
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
      {Array.from({ length: 4 }).map((_, i) => (
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
    <div className="text-center py-8 text-gray-500">
      <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p>No recent activity. Start connecting with professionals!</p>
    </div>
  );
}

/**
 * DashboardActivityFeed component content
 */
function DashboardActivityFeedContent({
  activities,
  isLoading = false,
  maxItems = 5,
  showViewAll = true
}: DashboardActivityFeedProps) {
  const displayActivities = maxItems > 0 ? activities.slice(0, maxItems) : activities;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-green-600" />
          Recent Activity
        </h2>
        {showViewAll && (
          <Link
            href={'/dashboard/activity' as Route}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            View All <ArrowRight className="inline w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <LoadingSkeleton />
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
 * DashboardActivityFeed - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function DashboardActivityFeed(props: DashboardActivityFeedProps) {
  return (
    <ErrorBoundary componentName="DashboardActivityFeed">
      <DashboardActivityFeedContent {...props} />
    </ErrorBoundary>
  );
}

export default DashboardActivityFeed;
