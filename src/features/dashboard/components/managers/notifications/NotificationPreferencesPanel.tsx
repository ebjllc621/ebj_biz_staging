/**
 * NotificationPreferencesPanel - Listing notification preferences wrapper
 *
 * STANDARD tier component wrapping the existing NotificationPreferencesSection
 * with listing-specific context: follower count, broadcast history, and digest preview.
 *
 * GOVERNANCE: Imports existing NotificationPreferencesSection — does NOT rebuild it.
 *
 * @tier STANDARD
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/features/notifications/components/NotificationPreferencesSection.tsx
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Users, Send, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import NotificationPreferencesSection from '@features/notifications/components/NotificationPreferencesSection';
import { DigestPreviewSection } from './DigestPreviewSection';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { UserNotificationPreferences } from '@core/services/notification/types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@core/services/notification/types';

// ============================================================================
// Types
// ============================================================================

interface BroadcastHistoryItem {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

interface NotificationPreferencesPanelProps {
  listingId: number;
}

// ============================================================================
// Inner Component (unwrapped, for ErrorBoundary wrapping below)
// ============================================================================

function NotificationPreferencesPanelInner({ listingId }: NotificationPreferencesPanelProps) {
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch notification preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/users/settings/notification-preferences', {
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.data?.preferences) {
        setPreferences(data.data.preferences);
      }
    } catch {
      // Use defaults on failure
    } finally {
      setIsLoadingPrefs(false);
    }
  }, []);

  // Fetch follower count and broadcast history
  const fetchListingData = useCallback(async () => {
    try {
      // Follower count
      const followersRes = await fetch(`/api/listings/${listingId}/stats`, {
        credentials: 'include'
      });
      if (followersRes.ok) {
        const followersData = await followersRes.json();
        setFollowerCount(followersData.data?.followers ?? 0);
      }

      // Broadcast history from user_notifications
      const historyRes = await fetch(
        `/api/notifications?entityType=listing&entityId=${listingId}&limit=5`,
        { credentials: 'include' }
      );
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setBroadcastHistory(historyData.data?.notifications ?? []);
      }
    } catch {
      // Silent failure
    } finally {
      setIsLoadingHistory(false);
    }
  }, [listingId]);

  useEffect(() => {
    void fetchPreferences();
    void fetchListingData();
  }, [fetchPreferences, fetchListingData]);

  const handlePreferencesChange = useCallback(async (updates: Partial<UserNotificationPreferences>) => {
    const updated = { ...preferences, ...updates };
    setPreferences(updated);
    setIsSavingPrefs(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetchWithCsrf('/api/users/settings/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updated })
      });

      if (!res.ok) throw new Error('Failed to save preferences');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  }, [preferences]);

  return (
    <div className="space-y-6">
      {/* Follower Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Users className="w-5 h-5 text-[#ed6437]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Listing Followers</h3>
            <p className="text-sm text-gray-500">Users who follow this listing</p>
          </div>
          <div className="ml-auto">
            <span className="text-2xl font-bold text-[#ed6437]">{followerCount}</span>
            <span className="text-sm text-gray-500 ml-1">followers</span>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Followers will receive notifications when you broadcast updates.
          Use the broadcast API at{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            POST /api/listings/{listingId}/broadcast
          </code>{' '}
          to notify all followers of important updates.
        </p>
      </div>

      {/* Broadcast History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Send className="w-5 h-5 text-[#ed6437]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Recent Broadcasts</h3>
            <p className="text-sm text-gray-500">Messages sent to your followers</p>
          </div>
        </div>

        {isLoadingHistory ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        ) : broadcastHistory.length > 0 ? (
          <div className="space-y-3">
            {broadcastHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm"
              >
                <Bell className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  {item.message && (
                    <p className="text-gray-500 text-xs truncate">{item.message}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No broadcast messages sent yet.</p>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Bell className="w-5 h-5 text-[#ed6437]" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-sm text-gray-500">Control your notification channels and frequency</p>
            </div>
          </div>
          {isSavingPrefs && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
          {saveSuccess && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {saveError}
          </div>
        )}

        {isLoadingPrefs ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <NotificationPreferencesSection
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
            isLoading={isSavingPrefs}
          />
        )}
      </div>

      {/* Digest Preview */}
      <DigestPreviewSection />
    </div>
  );
}

// ============================================================================
// Exported Component — STANDARD tier requires ErrorBoundary wrapper
// ============================================================================

export function NotificationPreferencesPanel(props: NotificationPreferencesPanelProps) {
  return (
    <ErrorBoundary componentName="NotificationPreferencesPanel">
      <NotificationPreferencesPanelInner {...props} />
    </ErrorBoundary>
  );
}

export default NotificationPreferencesPanel;
