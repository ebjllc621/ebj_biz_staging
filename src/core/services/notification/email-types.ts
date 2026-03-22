/**
 * Email Notification Types
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { NotificationEventType, NotificationCategory } from './types';

// ============================================================================
// Email Send Result
// ============================================================================

/**
 * Result of email send operation
 */
export interface EmailSendResult {
  /** Whether email was sent successfully */
  success: boolean;
  /** Email message ID from provider */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** Whether email was queued for digest */
  queued?: boolean;
  /** Scheduled date for digest (if queued) */
  scheduledFor?: Date;
}

// ============================================================================
// Email Queue Entry
// ============================================================================

/**
 * Entry in the notification email queue (for digest emails)
 */
export interface EmailQueueEntry {
  id: number;
  user_id: number;
  notification_id: number;
  event_type: NotificationEventType;
  category: NotificationCategory;
  title: string;
  message: string | null;
  action_url: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  digest_frequency: 'daily' | 'weekly';
  scheduled_for: Date;
  processed_at: Date | null;
  created_at: Date;
}

// ============================================================================
// Email Log Entry
// ============================================================================

/**
 * Email send log entry (audit trail)
 */
export interface EmailLogEntry {
  id: number;
  user_id: number;
  notification_id: number | null;
  email_type: 'immediate' | 'digest';
  event_type: string | null;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'bounced';
  provider: string | null;
  error_message: string | null;
  sent_at: Date;
}

// ============================================================================
// Unsubscribe Token
// ============================================================================

/**
 * Unsubscribe token record
 */
export interface UnsubscribeToken {
  id: number;
  user_id: number;
  token_hash: string;
  category: NotificationCategory | null; // null = all categories
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

/**
 * Result of creating an unsubscribe token
 */
export interface UnsubscribeTokenResult {
  /** The raw token to include in email links */
  token: string;
  /** Expiration timestamp */
  expiresAt: Date;
}

/**
 * Result of verifying an unsubscribe token
 */
export interface UnsubscribeVerifyResult {
  /** Whether token is valid */
  valid: boolean;
  /** User ID if valid */
  userId?: number;
  /** Category to unsubscribe from (null = all) */
  category?: NotificationCategory | null;
  /** Reason if invalid */
  reason?: 'invalid' | 'expired' | 'consumed';
}

// ============================================================================
// Email Template Types
// ============================================================================

/**
 * Template data for immediate notification email
 */
export interface ImmediateEmailTemplateData {
  /** User's display name */
  userName: string;
  /** Notification title */
  title: string;
  /** Notification message/body */
  message: string;
  /** Action button URL */
  actionUrl: string;
  /** Action button text */
  actionText: string;
  /** Notification type for styling */
  eventType: NotificationEventType;
  /** Category for grouping */
  category: NotificationCategory;
  /** Unsubscribe URL */
  unsubscribeUrl: string;
  /** Preferences URL */
  preferencesUrl: string;
}

/**
 * Template data for digest email
 */
export interface DigestEmailTemplateData {
  /** User's display name */
  userName: string;
  /** Digest frequency */
  frequency: 'daily' | 'weekly';
  /** Period description (e.g., "January 25, 2026" or "Week of Jan 20") */
  periodDescription: string;
  /** Grouped notifications by category */
  categories: {
    category: NotificationCategory;
    categoryLabel: string;
    notifications: {
      title: string;
      message: string;
      actionUrl: string;
      timestamp: Date;
    }[];
  }[];
  /** Total notification count */
  totalCount: number;
  /** Unsubscribe URL */
  unsubscribeUrl: string;
  /** Preferences URL */
  preferencesUrl: string;
}

// ============================================================================
// Email Notification Service Interface
// ============================================================================

/**
 * Email notification service interface
 */
export interface IEmailNotificationService {
  /**
   * Send immediate notification email
   */
  sendImmediateEmail(
    userId: number,
    notificationId: number,
    eventType: NotificationEventType,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<EmailSendResult>;

  /**
   * Queue notification for digest email
   */
  queueForDigest(
    userId: number,
    notificationId: number,
    eventType: NotificationEventType,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<EmailSendResult>;

  /**
   * Send digest emails for all pending users
   * Called by scheduler at configured times
   */
  sendPendingDigests(frequency: 'daily' | 'weekly'): Promise<{
    sent: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * Generate unsubscribe token for user
   */
  generateUnsubscribeToken(
    userId: number,
    category?: NotificationCategory
  ): Promise<UnsubscribeTokenResult>;

  /**
   * Verify and consume unsubscribe token
   */
  verifyUnsubscribeToken(token: string): Promise<UnsubscribeVerifyResult>;
}

// ============================================================================
// Email Template Constants
// ============================================================================

/**
 * Category labels for display in emails
 */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  messages: 'Messages',
  bizwire: 'BizWire',
  connections: 'Connections',
  reviews: 'Reviews',
  events: 'Events',
  subscriptions: 'Subscriptions',
  system: 'System',
  recommendations: 'Recommendations',
  referrals: 'Referrals',
  offers: 'Offers',
  jobs: 'Jobs',
  content: 'Content',
};

/**
 * Default action text by event type
 */
export const EVENT_ACTION_TEXT: Partial<Record<NotificationEventType, string>> = {
  'message.received': 'View Message',
  'connection.request_received': 'View Request',
  'connection.request_accepted': 'View Connection',
  'review.received': 'View Review',
  'event.rsvp_confirmed': 'View Event',
  'event.reminder': 'View Event',
  'subscription.payment_failed': 'Update Payment',
  'system.announcement': 'Learn More',
  'system.security_alert': 'Review Security',

  // Claim Events
  'claim.initiated': 'View Claim Status',
  'claim.verification_pending': 'Complete Verification',
  'claim.under_review': 'View Claim Status',
  'claim.approved': 'Manage Your Listing',
  'claim.rejected': 'Contact Support'
};

/**
 * Unsubscribe token expiration (30 days)
 */
export const UNSUBSCRIBE_TOKEN_TTL_DAYS = 30;
