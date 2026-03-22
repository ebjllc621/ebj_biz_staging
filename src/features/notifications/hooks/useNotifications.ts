/**
 * useNotifications Hook - Fetch paginated notifications
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/notifications/hooks/useNotificationPolling.ts
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type {
  NotificationItem,
  PaginatedNotifications,
  NotificationTypeKey
} from '../types/notification-ui';

interface UseNotificationsOptions {
  initialPage?: number;
  pageSize?: number;
  type?: NotificationTypeKey | 'all';
}

interface UseNotificationsReturn {
  notifications: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  currentType: NotificationTypeKey | 'all';
  setPage: (page: number) => void;
  setType: (type: NotificationTypeKey | 'all') => void;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { initialPage = 1, pageSize = 20, type: initialType = 'all' } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setTypeState] = useState<NotificationTypeKey | 'all'>(initialType);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (type !== 'all') {
        params.set('type', type);
      }

      const response = await fetch(`/api/dashboard/notifications?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const result = await response.json();
      const data: PaginatedNotifications = result.data || result;

      setNotifications(data.notifications.map(n => ({
        ...n,
        created_at: new Date(n.created_at)
      })));
      setTotal(data.total);
      setTotalPages(data.totalPages);

    } catch (err) {
      ErrorService.capture('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, type]);

  /**
   * Mark single notification as read
   */
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await fetchWithCsrf('/api/dashboard/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (err) {
      ErrorService.capture('Failed to mark notification as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetchWithCsrf('/api/dashboard/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      ErrorService.capture('Failed to mark all as read:', err);
      throw err;
    }
  }, []);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/dashboard/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => prev - 1);
    } catch (err) {
      ErrorService.capture('Failed to delete notification:', err);
      throw err;
    }
  }, []);

  /**
   * Set type filter and reset to page 1
   */
  const setType = useCallback((newType: NotificationTypeKey | 'all') => {
    setTypeState(newType);
    setPage(1);
  }, []);

  /**
   * Refresh current page
   */
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Fetch on mount and when filters change
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    currentType: type,
    setPage,
    setType,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}
