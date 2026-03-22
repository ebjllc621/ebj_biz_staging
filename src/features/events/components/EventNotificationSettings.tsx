/**
 * EventNotificationSettings - User notification settings for events
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Events Phase 2 - Notification System
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_2_PLAN.md
 *
 * Manages user's event notification preferences:
 * - Lists followed businesses/categories
 * - Frequency toggle per follow
 * - Unfollow action
 * - Global notification toggle
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Building2, Tag, Loader2, AlertCircle, RefreshCw, Trash2, Globe } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { EventFollowType, EventNotificationFrequency } from '@features/events/types';

// ============================================================================
// Types
// ============================================================================

interface EventFollow {
  id: number;
  follow_type: EventFollowType;
  target_id: number | null;
  target_name: string | null;
  notification_frequency: EventNotificationFrequency;
  created_at: string;
}

interface EventNotificationSettingsProps {
  /** Optional className for container */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FREQUENCY_LABELS: Record<EventNotificationFrequency, string> = {
  realtime: 'Instant',
  daily: 'Daily Digest',
  weekly: 'Weekly Digest'
};

const FOLLOW_TYPE_ICONS: Record<EventFollowType, React.ReactNode> = {
  business: <Building2 className="w-4 h-4" />,
  category: <Tag className="w-4 h-4" />,
  all_events: <Globe className="w-4 h-4" />
};

const FOLLOW_TYPE_LABELS: Record<EventFollowType, string> = {
  business: 'Business',
  category: 'Category',
  all_events: 'All Events'
};

// ============================================================================
// Component
// ============================================================================

export function EventNotificationSettings({ className = '' }: EventNotificationSettingsProps) {
  const [follows, setFollows] = useState<EventFollow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingFollowId, setUpdatingFollowId] = useState<number | null>(null);
  const [deletingFollowId, setDeletingFollowId] = useState<number | null>(null);

  // Fetch follows
  const fetchFollows = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/event-follows', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view notification settings');
        }
        throw new Error('Failed to load notification settings');
      }

      const data = await response.json();
      setFollows(data.data?.follows || []);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      ErrorService.capture('[EventNotificationSettings] fetchFollows failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollows();
  }, [fetchFollows]);

  // Update frequency
  const handleFrequencyChange = useCallback(async (follow: EventFollow, newFrequency: EventNotificationFrequency) => {
    try {
      setUpdatingFollowId(follow.id);

      const response = await fetchWithCsrf('/api/user/event-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: follow.follow_type,
          target_id: follow.target_id,
          frequency: newFrequency
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update notification frequency');
      }

      // Update local state
      setFollows(prev => prev.map(f =>
        f.id === follow.id
          ? { ...f, notification_frequency: newFrequency }
          : f
      ));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update';
      setError(message);
      ErrorService.capture('[EventNotificationSettings] handleFrequencyChange failed:', err);
    } finally {
      setUpdatingFollowId(null);
    }
  }, []);

  // Unfollow
  const handleUnfollow = useCallback(async (followId: number) => {
    try {
      setDeletingFollowId(followId);

      const response = await fetchWithCsrf(`/api/user/event-follows/${followId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove notification');
      }

      // Remove from local state
      setFollows(prev => prev.filter(f => f.id !== followId));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove';
      setError(message);
      ErrorService.capture('[EventNotificationSettings] handleUnfollow failed:', err);
    } finally {
      setDeletingFollowId(null);
    }
  }, []);

  // Add all_events follow
  const handleEnableAllEvents = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetchWithCsrf('/api/user/event-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follow_type: 'all_events',
          frequency: 'weekly'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enable all event notifications');
      }

      await fetchFollows();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable';
      setError(message);
      ErrorService.capture('[EventNotificationSettings] handleEnableAllEvents failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFollows]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-[#ed6437]" />
          <h3 className="text-lg font-semibold text-gray-900">Event Notifications</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#ed6437] animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-[#ed6437]" />
          <h3 className="text-lg font-semibold text-gray-900">Event Notifications</h3>
        </div>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchFollows}
            className="text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if user has all_events follow
  const hasAllEvents = follows.some(f => f.follow_type === 'all_events');

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-[#ed6437]" />
          <h3 className="text-lg font-semibold text-gray-900">Event Notifications</h3>
        </div>
        <button
          onClick={fetchFollows}
          className="text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Enable All Events Banner */}
      {!hasAllEvents && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium text-orange-800">Get All Event Updates</h4>
              <p className="text-sm text-orange-600 mt-1">
                Subscribe to get notified about all new events in your area
              </p>
            </div>
            <button
              onClick={handleEnableAllEvents}
              className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55830] text-sm font-medium whitespace-nowrap"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Follows List */}
      {follows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BellOff className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No event notifications set up yet.</p>
          <p className="text-sm mt-1">Follow businesses or categories to get notified of new events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {follows.map(follow => (
            <div
              key={follow.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-gray-500 mt-0.5">
                    {FOLLOW_TYPE_ICONS[follow.follow_type]}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {follow.target_name || FOLLOW_TYPE_LABELS[follow.follow_type]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {FOLLOW_TYPE_LABELS[follow.follow_type]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Frequency Dropdown */}
                  <select
                    value={follow.notification_frequency}
                    onChange={(e) => handleFrequencyChange(follow, e.target.value as EventNotificationFrequency)}
                    disabled={updatingFollowId === follow.id}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-[#ed6437] focus:border-[#ed6437] disabled:opacity-50"
                  >
                    <option value="realtime">{FREQUENCY_LABELS.realtime}</option>
                    <option value="daily">{FREQUENCY_LABELS.daily}</option>
                    <option value="weekly">{FREQUENCY_LABELS.weekly}</option>
                  </select>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleUnfollow(follow.id)}
                    disabled={deletingFollowId === follow.id}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove notification"
                  >
                    {deletingFollowId === follow.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {follows.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <p>
            You are receiving event notifications from {follows.length} source{follows.length !== 1 ? 's' : ''}.
          </p>
        </div>
      )}
    </div>
  );
}

export default EventNotificationSettings;
