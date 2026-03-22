/**
 * Notifications Feature Module
 *
 * Provides real-time notification polling with adaptive intervals
 * and tab visibility detection.
 */

// Types
export type {
  NotificationSummary,
  NotificationsByType,
  UseNotificationPollingOptions,
  UseNotificationPollingReturn,
} from './types';

// Hooks
export { useNotificationPolling } from './hooks/useNotificationPolling';
