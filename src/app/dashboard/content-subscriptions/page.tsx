/**
 * My Subscriptions Dashboard Page
 *
 * Displays and manages the authenticated user's content follow subscriptions.
 * Allows updating notification frequency and unfollowing content.
 *
 * @tier STANDARD
 * @phase Phase 8 - My Subscriptions Dashboard
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier4_Phases/PHASE_8_MY_SUBSCRIPTIONS_DASHBOARD.md
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  FolderOpen,
  FileText,
  Globe,
  Mail,
  Headphones,
  Megaphone,
  UserCircle,
  Rss
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { ContentFollow, ContentFollowType, ContentNotificationFrequency } from '@core/types/content-follow';
import { useSubscriptionAnalytics } from '@features/content/hooks/useSubscriptionAnalytics';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFollowTypeLabel(followType: ContentFollowType): string {
  const labels: Record<ContentFollowType, string> = {
    business: 'Business',
    category: 'Category',
    content_type: 'Content Type',
    all_content: 'All Content',
    newsletter: 'Newsletter',
    podcast_show: 'Podcast Show',
    marketer_profile: 'Marketer Profile',
    personality_profile: 'Personality Profile',
    podcaster_profile: 'Podcaster Profile'
  };
  return labels[followType] ?? followType;
}

function getFollowTypeIcon(followType: ContentFollowType): React.ReactNode {
  const iconProps = { className: 'w-5 h-5' };
  switch (followType) {
    case 'business':
      return <Building2 {...iconProps} />;
    case 'category':
      return <FolderOpen {...iconProps} />;
    case 'content_type':
      return <FileText {...iconProps} />;
    case 'all_content':
      return <Globe {...iconProps} />;
    case 'newsletter':
      return <Mail {...iconProps} />;
    case 'podcast_show':
      return <Headphones {...iconProps} />;
    case 'marketer_profile':
      return <Megaphone {...iconProps} />;
    case 'personality_profile':
      return <UserCircle {...iconProps} />;
    default:
      return <Rss {...iconProps} />;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ============================================================================
// MAIN CONTENT COMPONENT
// ============================================================================

function MySubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<ContentFollow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const analytics = useSubscriptionAnalytics(subscriptions);

  useEffect(() => {
    void loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/content/follow?list=true', {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const follows: ContentFollow[] = result.data?.follows ?? result.follows ?? [];
        const sorted = [...follows].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSubscriptions(sorted);
      } else {
        setError('Failed to load subscriptions.');
      }
    } catch (err) {
      ErrorService.capture('Failed to load subscriptions:', err);
      setError('An error occurred while loading subscriptions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (followId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/content/follow?followId=${followId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== followId));
      }
    } catch (err) {
      ErrorService.capture('Failed to unfollow:', err);
    }
  };

  const handleFrequencyChange = async (followId: number, frequency: ContentNotificationFrequency) => {
    try {
      const response = await fetchWithCsrf('/api/content/follow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followId, frequency })
      });
      if (response.ok) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === followId ? { ...s, notificationFrequency: frequency } : s))
        );
      }
    } catch (err) {
      ErrorService.capture('Failed to update frequency:', err);
    }
  };

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage your content subscriptions and notification preferences.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
          Loading subscriptions...
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage your content subscriptions and notification preferences.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  if (subscriptions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage your content subscriptions and notification preferences.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-700 font-medium">You haven&apos;t subscribed to any content yet.</p>
          <p className="text-gray-500 text-sm mt-1">
            Subscribe to businesses, newsletters, podcasts, and more to receive tailored updates.
          </p>
          <Link
            href="/content"
            className="inline-block mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Content
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: POPULATED
  // ============================================================================

  const frequencyCount = analytics.byFrequency;
  const typeCount = Object.keys(analytics.byType).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subscriptions</h1>
        <p className="text-gray-600 mt-1">Manage your content subscriptions and notification preferences.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Active */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Active</p>
          <p className="text-3xl font-bold text-gray-900">{analytics.totalActive}</p>
          <p className="text-sm text-gray-500 mt-1">
            {analytics.recentCount > 0
              ? `+${analytics.recentCount} in the last 7 days`
              : 'No new subscriptions this week'}
          </p>
        </div>

        {/* Notification Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Notifications</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Real-time</span>
              <span className="font-semibold text-gray-900">{frequencyCount['realtime'] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Daily digest</span>
              <span className="font-semibold text-gray-900">{frequencyCount['daily'] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Weekly digest</span>
              <span className="font-semibold text-gray-900">{frequencyCount['weekly'] ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Content Types */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Content Types</p>
          <p className="text-3xl font-bold text-gray-900">{typeCount}</p>
          <p className="text-sm text-gray-500 mt-1">
            {typeCount === 1 ? '1 type followed' : `${typeCount} types followed`}
          </p>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              {getFollowTypeIcon(sub.followType)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{getFollowTypeLabel(sub.followType)}</p>
              {sub.contentTypeFilter && (
                <p className="text-xs text-gray-500">Filter: {sub.contentTypeFilter}</p>
              )}
              <p className="text-xs text-gray-400">Subscribed {formatDate(sub.createdAt)}</p>
            </div>

            {/* Frequency Select */}
            <select
              value={sub.notificationFrequency}
              onChange={(e) =>
                void handleFrequencyChange(sub.id, e.target.value as ContentNotificationFrequency)
              }
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={`Notification frequency for ${getFollowTypeLabel(sub.followType)}`}
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>

            {/* Unfollow Button */}
            <button
              onClick={() => void handleUnfollow(sub.id)}
              className="flex-shrink-0 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 hover:text-red-600 hover:border-red-300 transition-colors"
            >
              Unsubscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT EXPORT — ErrorBoundary wrapper (STANDARD tier requirement)
// ============================================================================

export default function MySubscriptionsPage() {
  return (
    <ErrorBoundary componentName="MySubscriptionsPage">
      <MySubscriptionsContent />
    </ErrorBoundary>
  );
}
