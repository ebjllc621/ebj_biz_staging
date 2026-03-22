/**
 * Notification type breakdown from API
 */
export interface NotificationsByType {
  connection_request: number;
  message: number;
  bizwire: number;
  review: number;
  mention: number;
  system: number;
  recommendation: number;
}

/**
 * Notification summary response from API
 */
export interface NotificationSummary {
  total_unread: number;
  by_type: NotificationsByType;
}

/**
 * Options for useNotificationPolling hook
 */
export interface UseNotificationPollingOptions {
  /**
   * Default polling interval in milliseconds
   * @default 30000
   */
  defaultInterval?: number;

  /**
   * Enable adaptive polling based on current page
   * @default true
   */
  adaptive?: boolean;

  /**
   * Pause polling when browser tab is hidden
   * @default true
   */
  pauseWhenHidden?: boolean;
}

/**
 * Return type for useNotificationPolling hook
 */
export interface UseNotificationPollingReturn {
  /** Notification summary data */
  summary: NotificationSummary | null;

  /** Total unread count */
  unreadCount: number;

  /** Unread message count */
  unreadMessages: number;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;

  /** Manually refresh notifications */
  refresh: () => Promise<void>;
}
