/**
 * Dashboard Notifications Page
 *
 * Full-featured notification management interface with:
 * - Paginated notification list
 * - Filter by notification type
 * - Mark individual/all as read
 * - Delete notifications
 * - Real-time badge sync
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/dashboard/connections/page.tsx
 */

'use client';

import { useCallback, useState } from 'react';
import { Check, Settings } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationPolling } from '@/features/notifications/hooks/useNotificationPolling';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { NotificationFilters } from '@/features/notifications/components/NotificationFilters';
import { NotificationPagination } from '@/features/notifications/components/NotificationPagination';
import type { NotificationTypeKey } from '@/features/notifications/types/notification-ui';
import { useAuth } from '@/core/context/AuthContext';
import { UserProfileEditModal } from '@/features/profile/components/UserProfileEditModal';
import type { PublicProfile } from '@/features/profile/types';
import { ErrorService } from '@core/services/ErrorService';
import { OfferNotificationSettings } from '@/features/offers/components/OfferNotificationSettings';

function NotificationsPageContent() {
  const {
    notifications,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    currentType,
    setPage,
    setType,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications({ pageSize: 20 });

  // Use polling hook for badge sync
  const { summary, refresh: refreshBadge } = useNotificationPolling();

  // Get current user for profile modal
  const { user } = useAuth();

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<PublicProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Filter state from hook
  const activeFilter = currentType;

  // Count unread for button visibility
  const hasUnread = notifications.some(n => !n.is_read);

  /**
   * Handle mark as read with badge refresh
   */
  const handleMarkRead = useCallback(async (notificationId: number) => {
    await markAsRead(notificationId);
    await refreshBadge();
  }, [markAsRead, refreshBadge]);

  /**
   * Handle mark all as read with badge refresh
   */
  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    await refreshBadge();
  }, [markAllAsRead, refreshBadge]);

  /**
   * Handle delete with badge refresh
   */
  const handleDelete = useCallback(async (notificationId: number) => {
    await deleteNotification(notificationId);
    await refreshBadge();
  }, [deleteNotification, refreshBadge]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((filter: NotificationTypeKey | 'all') => {
    setType(filter);
  }, [setType]);

  /**
   * Handle settings button click - fetch profile and open modal
   */
  const handleOpenSettings = useCallback(async () => {
    if (!user) return;

    setIsLoadingProfile(true);
    try {
      const response = await fetch('/api/users/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.profile) {
          setUserProfile(data.data.profile);
          setIsSettingsOpen(true);
        }
      } else {
        ErrorService.capture('Failed to load user profile:', response.status);
      }
    } catch (error) {
      ErrorService.capture('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  /**
   * Handle profile update from modal
   */
  const handleProfileUpdate = useCallback((updatedProfile: PublicProfile) => {
    setUserProfile(updatedProfile);
  }, []);

  // Build counts from summary for filter badges
  const filterCounts = summary ? {
    all: summary.total_unread,
    connection_request: summary.by_type.connection_request,
    message: summary.by_type.message,
    review: summary.by_type.review,
    mention: summary.by_type.mention,
    system: summary.by_type.system,
    recommendation: summary.by_type.recommendation || 0
  } : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">
            {total > 0
              ? `${total} notification${total !== 1 ? 's' : ''}`
              : 'No notifications'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Notification Settings Button */}
          <button
            onClick={handleOpenSettings}
            disabled={isLoadingProfile}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-4 h-4" />
            Notification Settings
          </button>

          {/* Mark All Read Button */}
          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <NotificationFilters
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        counts={filterCounts}
      />

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          error={error}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
        />

        {/* Pagination */}
        <NotificationPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Offer Notification Settings */}
      <OfferNotificationSettings />

      {/* User Profile Edit Modal - opened to Settings tab */}
      {userProfile && (
        <UserProfileEditModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profile={userProfile}
          onProfileUpdate={handleProfileUpdate}
          initialTab="settings"
        />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ErrorBoundary componentName="DashboardNotificationsPage">
      <NotificationsPageContent />
    </ErrorBoundary>
  );
}
