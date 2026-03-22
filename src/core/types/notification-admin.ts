/**
 * Notification Admin Types
 *
 * @phase Phase 1 - Notification Admin Foundation
 * @authority docs/notificationService/admin/MASTER_INDEX_BRAIN_PLAN.md
 * @tier STANDARD
 */

import type { AlertLevel } from '@core/types/health';

/**
 * Channel health status
 */
export interface ChannelHealth {
  status: 'active' | 'degraded' | 'paused' | 'failed';
  lastSuccess: string | null;
  lastFailure: string | null;
  errorCount24h: number;
}

/**
 * Push channel health with circuit breaker
 */
export interface PushChannelHealth extends ChannelHealth {
  circuitBreaker: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    maxFailures: number;
    resetTimeoutMs: number;
    nextRetryAt: string | null;
  };
  devices: {
    total: number;
    active: number;
    byPlatform: {
      web: number;
      ios: number;
      android: number;
    };
  };
  deliveryStats24h?: PushDeliveryStats;
}

// ============================================================================
// PHASE 2 TYPES - PUSH DELIVERY TRACKING
// ============================================================================

/**
 * Push log entry status
 * @phase Phase 2 - Push Delivery Tracking
 */
export type PushLogStatus = 'sent' | 'delivered' | 'failed' | 'invalid_token';

/**
 * Push log entry for admin display
 * @phase Phase 2 - Push Delivery Tracking
 */
export interface PushLogEntry {
  id: number;
  notificationId: number | null;
  userId: number;
  deviceId: number | null;
  deviceToken: string;
  status: PushLogStatus;
  fcmMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  payloadType: string | null;
  sentAt: string;
}

/**
 * Push delivery statistics for a time window
 * @phase Phase 2 - Push Delivery Tracking
 */
export interface PushDeliveryStats {
  totalAttempts: number;
  successCount: number;
  failedCount: number;
  invalidTokenCount: number;
  deliveryRate: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
}

/**
 * Circuit breaker persisted state
 * @phase Phase 2 - Push Delivery Tracking
 */
export interface PersistedCircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: string | null;
  lastUpdated: string;
}

// ============================================================================
// PHASE 3 TYPES - EMAIL METRICS & ENGAGEMENT
// ============================================================================

/**
 * Email webhook event for provider callbacks
 * @phase Phase 3 - Email Metrics & Engagement
 */
export interface EmailWebhookEvent {
  provider: 'sendgrid' | 'mailgun' | 'ses';
  eventType: 'bounce' | 'complaint' | 'delivered' | 'dropped';
  recipientEmail: string;
  timestamp: string;
  reason?: string;
  bounceType?: 'hard' | 'soft';
}

/**
 * Email delivery log entry for admin display
 * @phase Phase 3 - Email Metrics & Engagement
 */
export interface EmailDeliveryLogEntry {
  id: number;
  emailType: 'immediate' | 'digest';
  eventType: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  provider: string;
  errorMessage: string | null;
  sentAt: string;
}

/**
 * Unsubscribe analytics for admin dashboard
 * @phase Phase 3 - Email Metrics & Engagement
 */
export interface UnsubscribeAnalytics {
  unsubscribes24h: number;
  totalUnsubscribes: number;
  byCategory: Record<string, number>;
}

/**
 * Email channel health
 */
export interface EmailChannelHealth extends ChannelHealth {
  immediate24h: number;
  digestQueueSize: number;
  bounceRate: number;
  nextDigestScheduled: string | null;
  // Phase 3 additions
  unsubscribes24h?: number;
  totalUnsubscribes?: number;
  unsubscribesByCategory?: Record<string, number>;
  digestQueueAgeHours?: number;
}

/**
 * In-app channel health
 */
export interface InAppChannelHealth extends ChannelHealth {
  created24h: number;
  readRate: number;
  typeDistribution: Record<string, number>;
}

/**
 * Notification health response - primary endpoint response
 */
export interface NotificationHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;

  channels: {
    inApp: InAppChannelHealth;
    push: PushChannelHealth;
    email: EmailChannelHealth;
  };

  metrics24h: {
    dispatched: number;
    delivered: number;
    failed: number;
    successRate: number;
  };

  activeAlerts: Array<{
    component: string;
    metric: string;
    level: AlertLevel;
    message: string;
  }>;

  queues: {
    digestPending: number;
    pushRetryPending: number;
  };
}

/**
 * Notification alert thresholds (configurable)
 */
export interface NotificationAlertThresholds {
  errorRate: {
    warning: number;  // Default: 2%
    critical: number; // Default: 5%
  };
  fcmFailures: {
    warning: number;  // Default: 3
    critical: number; // Default: 5
  };
  digestQueueAge: {
    warning: number;  // Default: 24 hours
    critical: number; // Default: 48 hours
  };
  pushDeliveryRate: {
    warning: number;  // Default: 95%
    critical: number; // Default: 90%
  };
}

/**
 * Default alert thresholds
 */
export const DEFAULT_NOTIFICATION_THRESHOLDS: NotificationAlertThresholds = {
  errorRate: { warning: 2, critical: 5 },
  fcmFailures: { warning: 3, critical: 5 },
  digestQueueAge: { warning: 24, critical: 48 },
  pushDeliveryRate: { warning: 95, critical: 90 }
};

/**
 * Time-series data point for metrics charts
 * @phase Phase 3 - Delivery Metrics Panel
 */
export interface NotificationMetricsHistoryPoint {
  timestamp: number;
  dispatchedPerMinute: number;
  deliveredPerMinute: number;
  failedPerMinute: number;
  avgLatencyMs: number | null;  // Can be null when not tracked
  p95LatencyMs: number | null;  // Can be null when not tracked
  p99LatencyMs: number | null;  // Can be null when not tracked
  channelDistribution: {
    inApp: number;
    push: number | null;  // Can be null when not tracked
    email: number;
  };
}

/**
 * Event type breakdown for chart
 * @phase Phase 3 - Delivery Metrics Panel
 */
export interface EventTypeMetric {
  eventType: string;
  count: number;
  percentage: number;
}

/**
 * Metrics response with history for charts
 * @phase Phase 3 - Delivery Metrics Panel
 */
export interface NotificationMetricsResponse {
  /** Current aggregated metrics (1-hour window) */
  current: {
    dispatchedPerMinute: number;
    avgLatencyMs: number | null;  // Can be null when not tracked
    p95LatencyMs: number | null;  // Can be null when not tracked
    p99LatencyMs: number | null;  // Can be null when not tracked
    successRate: number;
  };

  /** Time-series history (60 points, 1-minute intervals) */
  history: NotificationMetricsHistoryPoint[];

  /** Channel distribution (1-hour totals) */
  channelDistribution: {
    inApp: number;
    push: number | null;  // Can be null when not tracked
    email: number;
    total: number;
  };

  /** Top 10 event types (1-hour) */
  eventTypeBreakdown: EventTypeMetric[];

  /** Metadata */
  windowStart: string;
  windowEnd: string;
  dataPoints: number;
}

/**
 * Chart threshold configuration for metrics
 * @phase Phase 3 - Delivery Metrics Panel
 */
export const NOTIFICATION_METRIC_THRESHOLDS = {
  dispatchRate: { warning: 10, critical: 5 }, // Low rate warnings
  avgLatencyMs: { warning: 100, critical: 500 },
  p95LatencyMs: { warning: 200, critical: 1000 },
  failureRate: { warning: 2, critical: 5 } // Percentage
};

// ============================================================================
// PHASE 4 TYPES - DISPATCH LATENCY & TIME-SERIES
// ============================================================================

/**
 * Dispatch metric record for aggregation table
 * @phase Phase 4 - Delivery Latency & Time-Series
 */
export interface DispatchMetricRecord {
  timestamp: string;
  periodMinutes: number;
  dispatchedCount: number;
  deliveredCount: number;
  failedCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  inAppCount: number;
  pushCount: number;
  emailCount: number;
  eventTypeCounts: Record<string, number>;
}

/**
 * Latency summary for admin display
 * @phase Phase 4 - Delivery Latency & Time-Series
 */
export interface LatencySummary {
  avgMs: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  sampleCount: number;
  windowMinutes: number;
}

// ============================================================================
// PHASE 4 TYPES - QUEUE MANAGEMENT
// ============================================================================

/**
 * Email digest queue entry for admin display
 * @phase Phase 4 - Queue Management Panel
 */
export interface DigestQueueEntry {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  notificationId: number;
  eventType: string;
  category: string;
  title: string;
  message: string | null;
  actionUrl: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  digestFrequency: 'daily' | 'weekly';
  scheduledFor: string;
  createdAt: string;
  ageHours: number;
}

/**
 * Stale notification entry for admin display
 * @phase Phase 4 - Queue Management Panel
 */
export interface StaleNotificationEntry {
  id: number;
  userId: number;
  userName: string;
  notificationType: string;
  title: string;
  isRead: boolean;
  createdAt: string;
  ageDays: number;
}

/**
 * Queue statistics for overview
 * @phase Phase 4 - Queue Management Panel
 */
export interface QueueStatistics {
  digestQueue: {
    totalPending: number;
    dailyPending: number;
    weeklyPending: number;
    oldestEntryHours: number;
    usersAffected: number;
  };
  staleNotifications: {
    total: number;
    unread: number;
    olderThan30Days: number;
    olderThan90Days: number;
  };
}

/**
 * Digest queue API response
 * @phase Phase 4 - Queue Management Panel
 */
export interface DigestQueueResponse {
  items: DigestQueueEntry[];
  statistics: QueueStatistics['digestQueue'];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Stale notifications API response
 * @phase Phase 4 - Queue Management Panel
 */
export interface StaleNotificationsResponse {
  items: StaleNotificationEntry[];
  statistics: QueueStatistics['staleNotifications'];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

/**
 * Queue action result
 * @phase Phase 4 - Queue Management Panel
 */
export interface QueueActionResult {
  success: boolean;
  message: string;
  processed?: number;
  failed?: number;
  errors?: string[];
}

/**
 * Thresholds for queue health indicators
 * @phase Phase 4 - Queue Management Panel
 */
export const QUEUE_THRESHOLDS = {
  digestAgeHours: { warning: 24, critical: 48 },
  staleNotificationsDays: { warning: 30, critical: 90 },
  queueSize: { warning: 100, critical: 500 }
};

// ============================================================================
// PHASE 5 TYPES - TROUBLESHOOTING PANEL
// ============================================================================

/**
 * User lookup result for troubleshooting
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootUserResult {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  createdAt: string;
  lastLoginAt: string | null;
  notificationStats: {
    total: number;
    unread: number;
    last7Days: number;
  };
  pushDevices: {
    total: number;
    active: number;
  };
  preferences: {
    masterEnabled: boolean;
    quietHoursEnabled: boolean;
  };
}

/**
 * Notification history entry for troubleshooting
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootNotificationEntry {
  id: number;
  type: string;
  category: string;
  title: string;
  message: string | null;
  actionUrl: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  ageMinutes: number;
  deliveryStatus: {
    inApp: 'delivered';
    push: 'sent' | 'failed' | 'skipped' | 'no_devices' | null;
    email: 'sent' | 'queued' | 'failed' | 'skipped' | null;
  };
}

/**
 * Detailed notification with full delivery chain
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootNotificationDetail extends TroubleshootNotificationEntry {
  user: {
    id: number;
    email: string;
    name: string;
  };
  deliveryChain: DeliveryChainEvent[];
  retryEligible: boolean;
  retryReason: string | null;
}

/**
 * Single event in notification delivery chain
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface DeliveryChainEvent {
  channel: 'in_app' | 'push' | 'email';
  action: 'created' | 'sent' | 'delivered' | 'failed' | 'skipped' | 'queued' | 'read';
  timestamp: string;
  status: 'success' | 'failure' | 'pending';
  details: string | null;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * User lookup API response
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootUserResponse {
  user: TroubleshootUserResult | null;
  found: boolean;
  searchTerm: string;
  searchType: 'email' | 'id';
}

/**
 * Notification history API response
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootHistoryResponse {
  userId: number;
  notifications: TroubleshootNotificationEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    type?: string;
    status?: string;
    daysBack: number;
  };
}

/**
 * Retry action response
 * @phase Phase 5 - Troubleshooting Panel
 */
export interface TroubleshootRetryResponse {
  success: boolean;
  message: string;
  notificationId: number;
  newNotificationId?: number;
  channelsAttempted: string[];
  channelsSucceeded: string[];
}

// ============================================================================
// PHASE 6 TYPES - SETUP GUIDES PANEL
// ============================================================================

/**
 * Firebase configuration status
 * @phase Phase 6 - Setup Guides Panel
 */
export interface FirebaseStatus {
  /** Whether Firebase credentials are configured in environment */
  configured: boolean;
  /** Validation status of credentials */
  credentialStatus: 'valid' | 'invalid' | 'not_configured' | 'unknown';
  /** Firebase project ID (masked for security) */
  projectIdMasked: string | null;
  /** FCM Server Key status */
  serverKeyConfigured: boolean;
  /** Service worker registration status */
  serviceWorkerRegistered: boolean;
  /** Circuit breaker current state */
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  /** Last credential validation timestamp */
  lastValidated: string | null;
  /** Error message if validation failed */
  errorMessage: string | null;
}

/**
 * WebSocket upgrade trigger condition
 * @phase Phase 6 - Setup Guides Panel
 */
export interface TriggerCondition {
  name: string;
  description: string;
  currentValue: string | number;
  threshold: string | number;
  met: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * WebSocket upgrade guide status
 * @phase Phase 6 - Setup Guides Panel
 */
export interface WebSocketStatus {
  /** Current transport mechanism */
  currentTransport: 'polling' | 'websocket';
  /** Current polling interval configuration */
  pollingIntervals: {
    messages: number;
    dashboard: number;
    other: number;
  };
  /** Trigger conditions for WebSocket upgrade */
  triggerConditions: TriggerCondition[];
  /** Estimated cost comparison */
  costComparison: {
    pollingDailyUsd: number;
    websocketDailyUsd: number;
    breakEvenConcurrentUsers: number;
  };
  /** Link to full documentation */
  documentationUrl: string;
}

/**
 * Setup guides API response
 * @phase Phase 6 - Setup Guides Panel
 */
export interface SetupGuidesResponse {
  firebase: FirebaseStatus;
  webSocket: WebSocketStatus;
  lastUpdated: string;
}

/**
 * Test push notification response
 * @phase Phase 6 - Setup Guides Panel
 */
export interface TestPushResponse {
  success: boolean;
  message: string;
  deviceToken?: string;
  fcmResponse?: {
    messageId: string;
    success: boolean;
  };
  error?: string;
}

/**
 * Firebase setup step
 * @phase Phase 6 - Setup Guides Panel
 */
export interface FirebaseSetupStep {
  stepNumber: number;
  title: string;
  description: string;
  completed: boolean;
  instructions: string[];
}

// ============================================================================
// PHASE 7 TYPES - PREFERENCES ANALYTICS PANEL
// ============================================================================

/**
 * Category-level analytics
 * @phase Phase 7 - Preferences Analytics Panel
 */
export interface CategoryAnalytics {
  /** Category name */
  category: string;
  /** Display label */
  label: string;
  /** Users with category enabled */
  enabledCount: number;
  /** Percentage of users with category enabled */
  enabledPercentage: number;
  /** Users with in-app enabled */
  inAppEnabledCount: number;
  /** Users with push enabled */
  pushEnabledCount: number;
  /** Email preference breakdown */
  emailBreakdown: {
    immediate: number;
    digest: number;
    never: number;
  };
}

/**
 * Quiet hours usage analytics
 * @phase Phase 7 - Preferences Analytics Panel
 */
export interface QuietHoursAnalytics {
  /** Users with quiet hours enabled */
  enabledCount: number;
  /** Percentage of users with quiet hours enabled */
  enabledPercentage: number;
  /** Common start times (top 3) */
  commonStartTimes: Array<{ time: string; count: number }>;
  /** Common end times (top 3) */
  commonEndTimes: Array<{ time: string; count: number }>;
  /** Most common timezone */
  topTimezone: string;
}

/**
 * Digest preferences analytics
 * @phase Phase 7 - Preferences Analytics Panel
 */
export interface DigestAnalytics {
  /** Users with digest enabled */
  enabledCount: number;
  /** Percentage of users with digest enabled */
  enabledPercentage: number;
  /** Frequency breakdown */
  frequencyBreakdown: {
    daily: number;
    weekly: number;
  };
  /** Common digest times (top 3) */
  commonDigestTimes: Array<{ time: string; count: number }>;
}

/**
 * Complete preferences analytics response
 * @phase Phase 7 - Preferences Analytics Panel
 */
export interface PreferencesAnalyticsResponse {
  /** Total users analyzed (excluding visitors) */
  totalUsers: number;
  /** Users with custom preferences (non-default) */
  usersWithCustomPreferences: number;

  /** Global opt-out statistics */
  globalOptOut: {
    count: number;
    percentage: number;
  };

  /** Per-category analytics */
  categories: CategoryAnalytics[];

  /** Quiet hours analytics */
  quietHours: QuietHoursAnalytics;

  /** Digest analytics */
  digest: DigestAnalytics;

  /** Timestamp of analysis */
  analyzedAt: string;

  /** Analysis metadata */
  metadata: {
    /** How long the analysis took in ms */
    analysisTimeMs: number;
    /** Data freshness indicator */
    dataAge: 'fresh' | 'cached';
  };
}

// ============================================================================
// PHASE 8 TYPES - ADMINISTRATIVE ACTIONS PANEL
// ============================================================================

/**
 * Channel status values
 * @phase Phase 8 - Administrative Actions Panel
 */
export type ChannelStatus = 'active' | 'paused';

/**
 * Channel names for admin control
 * @phase Phase 8 - Administrative Actions Panel
 */
export type AdminChannel = 'inApp' | 'push' | 'email';

/**
 * Admin configuration response
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface AdminConfigResponse {
  /** Current channel statuses */
  channelStatus: Record<AdminChannel, ChannelStatus>;
  /** Cleanup settings */
  cleanupSettings: {
    staleNotificationsDays: number;
    inactiveDevicesDays: number;
  };
  /** Last cleanup timestamps */
  lastCleanup: {
    tokens: string | null;
    notifications: string | null;
  };
  /** Configuration last updated */
  updatedAt: string;
  /** Admin who made last update */
  updatedBy: number | null;
}

/**
 * Channel pause/resume action result
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface ChannelActionResult {
  success: boolean;
  message: string;
  channel: AdminChannel;
  previousStatus: ChannelStatus;
  newStatus: ChannelStatus;
  updatedAt: string;
}

/**
 * Token cleanup result
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface TokenCleanupResult {
  success: boolean;
  message: string;
  /** Tokens cleaned up */
  cleanedCount: number;
  /** Tokens that were already inactive */
  alreadyInactiveCount: number;
  /** Total devices before cleanup */
  totalDevicesBefore: number;
  /** Active devices after cleanup */
  activeDevicesAfter: number;
  /** Cleanup timestamp */
  cleanedAt: string;
  /** Dry run indicator */
  dryRun: boolean;
}

/**
 * Admin action audit entry
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface AdminActionAudit {
  action: string;
  target: string;
  adminId: number;
  adminEmail: string;
  timestamp: string;
  details: Record<string, unknown>;
  result: 'success' | 'failure';
}

/**
 * Test notification request
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface TestNotificationRequest {
  /** Channel to test */
  channel: AdminChannel;
  /** Custom message (optional) */
  customMessage?: string;
}

/**
 * Test notification result
 * @phase Phase 8 - Administrative Actions Panel
 */
export interface TestNotificationResult {
  success: boolean;
  message: string;
  channel: AdminChannel;
  sentAt: string;
  details?: {
    notificationId?: number;
    deviceToken?: string;
    emailRecipient?: string;
  };
  error?: string;
}
