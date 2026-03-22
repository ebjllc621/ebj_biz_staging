/**
 * BusinessActivityFeed - Unified Business Activity Display (Public)
 *
 * @description "What's New at [Business]" feed on listing detail page
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5A - Cross-Feature Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5A_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/ListingActivityFeed.tsx
 *
 * Replicates the ListingActivityFeed card pattern (colored borders, relative timestamps)
 * but fetches from the public activity-feed API and renders on the listing detail page.
 * Returns null when there is no activity to avoid rendering an empty section.
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Calendar, Briefcase, Tag, Star, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ============================================================================
// Types
// ============================================================================

interface ActivityFeedItem {
  id: string;
  type: 'event' | 'job' | 'offer' | 'review';
  title: string;
  description: string;
  created_at: string;
}

export interface BusinessActivityFeedProps {
  /** Numeric listing ID for the API call */
  listingId: number;
  /** Business name for the section heading */
  listingName: string;
  /** Maximum items to display (default 6, max 50) */
  maxItems?: number;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_CONFIG: Record<string, { color: string; icon: typeof Calendar; label: string }> = {
  event: { color: 'border-orange-200 bg-orange-50', icon: Calendar, label: 'Event' },
  job: { color: 'border-blue-200 bg-blue-50', icon: Briefcase, label: 'Job' },
  offer: { color: 'border-green-200 bg-green-50', icon: Tag, label: 'Offer' },
  review: { color: 'border-yellow-200 bg-yellow-50', icon: Star, label: 'Review' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 30) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// ============================================================================
// Sub-Components
// ============================================================================

function ActivityCard({ item }: { item: ActivityFeedItem }) {
  const rawConfig = TYPE_CONFIG[item.type];
  const color = rawConfig?.color ?? 'border-orange-200 bg-orange-50';
  const label = rawConfig?.label ?? 'Activity';
  const Icon = rawConfig?.icon ?? Calendar;

  return (
    <div className={`border-l-4 ${color} pl-4 py-3 rounded-r-lg`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-gray-900 font-medium text-sm">{item.title}</p>
      {item.description && (
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
      )}
      <p className="text-gray-400 text-xs mt-1">{formatRelativeTime(item.created_at)}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function BusinessActivityFeedContent({
  listingId,
  listingName,
  maxItems = 6
}: BusinessActivityFeedProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/listings/${listingId}/activity-feed?limit=${maxItems}`);
      if (!res.ok) throw new Error('Failed to load activity');
      const result = await res.json();
      setItems(result.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, maxItems]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  // Don't render section if no activity and not loading (and no error)
  if (!isLoading && !error && items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
        <Activity className="w-5 h-5 mr-2 text-[#ed6437]" />
        What&apos;s New at {listingName}
      </h2>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-center py-6 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Unable to load recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Exported Component (ErrorBoundary wrapped — STANDARD tier requirement)
// ============================================================================

export function BusinessActivityFeed(props: BusinessActivityFeedProps) {
  return (
    <ErrorBoundary componentName="BusinessActivityFeed">
      <BusinessActivityFeedContent {...props} />
    </ErrorBoundary>
  );
}

export default BusinessActivityFeed;
