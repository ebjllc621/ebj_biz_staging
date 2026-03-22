'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePageVisibility } from '@core/hooks/usePageVisibility';
import { ErrorService } from '@core/services/ErrorService';
import type {
  NotificationSummary,
  UseNotificationPollingOptions,
  UseNotificationPollingReturn,
} from '../types';

const DEFAULT_INTERVAL = 30000; // 30 seconds

/**
 * Hook for adaptive notification polling with visibility detection
 *
 * Adaptive intervals based on current page:
 * - /dashboard/messages → 10 seconds (high priority)
 * - /dashboard/* → 30 seconds (medium priority)
 * - Other pages → 60 seconds (low priority)
 *
 * Automatically pauses polling when tab is hidden to save resources.
 */
export function useNotificationPolling(
  options: UseNotificationPollingOptions = {}
): UseNotificationPollingReturn {
  const {
    defaultInterval = DEFAULT_INTERVAL,
    adaptive = true,
    pauseWhenHidden = true,
  } = options;

  const pathname = usePathname();
  const isVisible = usePageVisibility();

  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate polling interval based on current page
   */
  const getPollingInterval = useCallback((): number => {
    if (!adaptive) {
      return defaultInterval;
    }

    // High priority: messages and bizwire pages
    if (pathname === '/dashboard/messages' || pathname?.includes('/bizwire')) {
      return 10000; // 10 seconds
    }

    // Medium priority: other dashboard pages
    if (pathname?.startsWith('/dashboard')) {
      return 30000; // 30 seconds
    }

    // Low priority: all other pages
    return 60000; // 60 seconds
  }, [adaptive, defaultInterval, pathname]);

  /**
   * Fetch notification summary from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/notifications/summary', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const result = await response.json();
      const data = result.data || result;

      setSummary(data);
    } catch (err) {
      ErrorService.capture('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Setup polling with adaptive intervals and visibility detection
   */
  useEffect(() => {
    // Don't poll if tab is hidden and pauseWhenHidden is enabled
    if (pauseWhenHidden && !isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    void fetchNotifications();

    // Setup polling interval
    const interval = getPollingInterval();
    intervalRef.current = setInterval(() => {
      void fetchNotifications();
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchNotifications, getPollingInterval, isVisible, pauseWhenHidden]);

  /**
   * Derived values
   */
  const unreadCount = summary?.total_unread || 0;
  const unreadMessages = summary?.by_type?.message || 0;

  return {
    summary,
    unreadCount,
    unreadMessages,
    isLoading,
    error,
    refresh,
  };
}
