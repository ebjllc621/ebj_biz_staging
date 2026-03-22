/**
 * NotificationList - List wrapper with states
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { Bell, Loader2 } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import type { NotificationItem as NotificationItemType } from '../types/notification-ui';

interface NotificationListProps {
  notifications: NotificationItemType[];
  isLoading: boolean;
  error: string | null;
  onMarkRead?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function NotificationList({
  notifications,
  isLoading,
  error,
  onMarkRead,
  onDelete
}: NotificationListProps) {
  // Loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading notifications...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Bell className="w-12 h-12 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No notifications</h3>
        <p className="text-sm">You're all caught up! Check back later.</p>
      </div>
    );
  }

  // Notification list
  return (
    <div className="space-y-3">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default NotificationList;
