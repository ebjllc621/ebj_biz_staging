/**
 * NotificationService - Unified Notification Dispatch Hub
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/notificationService/MASTER_INDEX_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/core/services/CategoryService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { NotificationPreferencesService } from './NotificationPreferencesService';
import { PushDeviceService } from './notification/PushDeviceService';
import { EmailNotificationService } from './notification/EmailNotificationService';
import { PushPayload } from './notification/push-types';
import { ErrorService } from '@core/services/ErrorService';
import {
  NotificationEvent,
  DispatchResult,
  NotificationChannel,
  EVENT_TO_LEGACY_TYPE,
  EVENT_TYPE_TO_CATEGORY
} from './notification/types';

// ============================================================================
// Custom Errors
// ============================================================================

export class NotificationError extends BizError {
  constructor(message: string) {
    super({ code: 'NOTIFICATION_ERROR', message, userMessage: message });
    this.name = 'NotificationError';
  }
}

export class InvalidRecipientError extends BizError {
  constructor(recipientId: number) {
    super({
      code: 'INVALID_RECIPIENT',
      message: `Invalid recipient ID: ${recipientId}`,
      userMessage: 'Invalid notification recipient'
    });
    this.name = 'InvalidRecipientError';
  }
}

// ============================================================================
// NotificationService Implementation
// ============================================================================

export class NotificationService {
  private db: DatabaseService;
  private preferencesService: NotificationPreferencesService;
  private pushService: PushDeviceService | null;
  private emailService: EmailNotificationService | null;

  constructor(
    db: DatabaseService,
    preferencesService?: NotificationPreferencesService,
    pushService?: PushDeviceService,
    emailService?: EmailNotificationService
  ) {
    this.db = db;
    this.preferencesService = preferencesService || new NotificationPreferencesService(db);
    this.pushService = pushService || null;
    this.emailService = emailService || null;
  }

  // ==========================================================================
  // Core Dispatch
  // ==========================================================================

  /**
   * Primary dispatch method - all notifications flow through here
   *
   * Phase 1: In-app notifications only
   * Phase 2: Added preference checking
   * Phase 3: Added push notifications
   * Phase 4: Added email notifications
   *
   * @param event Notification event to dispatch
   * @returns Dispatch result
   */
  async dispatch(event: NotificationEvent): Promise<DispatchResult> {
    // Phase 4: Start timing
    const dispatchStart = Date.now();

    // 1. Validate event
    this.validateEvent(event);

    // 2. Validate recipient exists
    const recipientExists = await this.validateRecipient(event.recipientId);
    if (!recipientExists) {
      throw new InvalidRecipientError(event.recipientId);
    }

    // 3. Phase 2: Check user preferences
    const shouldNotify = await this.preferencesService.shouldNotify(
      event.recipientId,
      event.type
    );

    if (!shouldNotify) {
      return {
        dispatched: false,
        reason: 'user_preference'
      };
    }

    // 4. Phase 2: Check quiet hours (skip for urgent priority)
    const isQuietTime = event.priority !== 'urgent'
      ? await this.preferencesService.isQuietHours(event.recipientId)
      : false;

    // 5. Store in-app notification (always)
    const notificationId = await this.createInAppNotification(event);

    // 6. Get enabled channels from preferences
    const enabledChannels = await this.preferencesService.getEnabledChannels(
      event.recipientId,
      event.type
    );

    // Track dispatched channels
    const channels: NotificationChannel[] = ['in_app'];

    // 7. Phase 3: Send push notifications if enabled and not quiet hours
    if (
      this.pushService &&
      enabledChannels.includes('push') &&
      !isQuietTime
    ) {
      try {
        const pushPayload = this.createPushPayload(event);
        const pushResult = await this.pushService.sendToUser(event.recipientId, pushPayload, {
          notificationId,
          payloadType: event.type
        });

        if (pushResult.success && pushResult.successCount > 0) {
          channels.push('push');
        }
      } catch (error) {
        // Log error but don't fail dispatch
        ErrorService.capture('[NotificationService] Push notification failed:', error);
      }
    }

    // 8. Phase 4: Send email notification if enabled and not quiet hours
    if (
      this.emailService &&
      enabledChannels.includes('email') &&
      !isQuietTime
    ) {
      try {
        // Get email delivery mode for this category
        const preferences = await this.preferencesService.getPreferences(event.recipientId);
        const category = EVENT_TYPE_TO_CATEGORY[event.type];
        const categoryPrefs = preferences.categories[category];
        const emailMode = categoryPrefs?.email || 'never';

        if (emailMode === 'immediate') {
          // Send immediate email
          const emailResult = await this.emailService.sendImmediateEmail(
            event.recipientId,
            notificationId,
            event.type,
            event.title,
            event.message || '',
            event.actionUrl
          );

          if (emailResult.success) {
            channels.push('email');
          }
        } else if (emailMode === 'digest') {
          // Queue for digest
          const queueResult = await this.emailService.queueForDigest(
            event.recipientId,
            notificationId,
            event.type,
            event.title,
            event.message || '',
            event.actionUrl
          );

          if (queueResult.queued) {
            // Don't add to channels yet - will be sent in digest
            // Could add 'email_queued' if we want to track this
          }
        }
      } catch (error) {
        // Log but don't fail the notification dispatch
        ErrorService.capture('[NotificationService] Email send failed:', error);
      }
    }

    // Phase 4: Calculate latency
    const latencyMs = Date.now() - dispatchStart;

    // Phase 4: Record dispatch metric (non-blocking)
    this.recordDispatchMetric(event, channels, latencyMs).catch(err =>
      ErrorService.capture('[NotificationService] Failed to record dispatch metric:', err)
    );

    return {
      dispatched: true,
      notificationId,
      channels,
      latencyMs
    };
  }

  /**
   * Validate notification event structure
   */
  private validateEvent(event: NotificationEvent): void {
    if (!event.type) {
      throw new NotificationError('Event type is required');
    }

    if (!event.recipientId || event.recipientId <= 0) {
      throw new NotificationError('Valid recipient ID is required');
    }

    if (!event.title || event.title.trim().length === 0) {
      throw new NotificationError('Notification title is required');
    }

    if (!event.priority) {
      throw new NotificationError('Priority level is required');
    }
  }

  /**
   * Validate recipient user exists
   */
  private async validateRecipient(userId: number): Promise<boolean> {
    const result = await this.db.query<{ id: number }>(
      'SELECT id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    return result.rows.length > 0;
  }

  /**
   * Create push notification payload from event
   *
   * Maps NotificationEvent to PushPayload format
   */
  private createPushPayload(event: NotificationEvent): PushPayload {
    return {
      title: event.title,
      body: event.message || '',
      icon: '/icons/icon-192x192.png',
      actionUrl: event.actionUrl || '/dashboard/notifications',
      tag: event.type,
      requireInteraction: event.priority === 'urgent' || event.priority === 'high',
      data: {
        type: event.type,
        priority: event.priority,
        ...(event.entityType && { entityType: event.entityType }),
        ...(event.entityId && { entityId: event.entityId.toString() }),
        ...(event.metadata && { metadata: JSON.stringify(event.metadata) })
      }
    };
  }

  /**
   * Create in-app notification in database
   *
   * Uses existing user_notifications table schema
   */
  private async createInAppNotification(event: NotificationEvent): Promise<number> {
    // Map event type to legacy notification_type for backward compatibility
    const notificationType = EVENT_TO_LEGACY_TYPE[event.type] || 'system';

    const result = await this.db.query(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, entity_type, entity_id, action_url, metadata, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        event.recipientId,
        notificationType,
        event.title,
        event.message || null,
        event.entityType || null,
        event.entityId || null,
        event.actionUrl || null,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]
    );

    return result.insertId!;
  }

  /**
   * Record a dispatch metric for aggregation
   * Non-blocking - errors are logged but don't affect dispatch
   * @phase Phase 4 - Delivery Latency & Time-Series
   */
  private async recordDispatchMetric(
    event: NotificationEvent,
    channels: NotificationChannel[],
    latencyMs: number
  ): Promise<void> {
    const hasInApp = channels.includes('in_app');
    const hasPush = channels.includes('push');
    const hasEmail = channels.includes('email');

    await this.db.query(
      `INSERT INTO notification_dispatch_metrics
       (timestamp, period_minutes, dispatched_count, delivered_count, failed_count,
        avg_latency_ms, p95_latency_ms, p99_latency_ms,
        in_app_count, push_count, email_count, event_type_counts)
       VALUES (
         DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00'),
         1,
         1, 1, 0,
         ?, ?, ?,
         ?, ?, ?,
         JSON_OBJECT(?, 1)
       )
       ON DUPLICATE KEY UPDATE
         dispatched_count = dispatched_count + 1,
         delivered_count = delivered_count + 1,
         in_app_count = in_app_count + ?,
         push_count = push_count + ?,
         email_count = email_count + ?,
         avg_latency_ms = ROUND((avg_latency_ms * (dispatched_count - 1) + ?) / dispatched_count),
         p95_latency_ms = GREATEST(p95_latency_ms, ?),
         p99_latency_ms = GREATEST(p99_latency_ms, ?)`,
      [
        latencyMs, latencyMs, latencyMs,
        hasInApp ? 1 : 0, hasPush ? 1 : 0, hasEmail ? 1 : 0,
        event.type,
        hasInApp ? 1 : 0, hasPush ? 1 : 0, hasEmail ? 1 : 0,
        latencyMs, latencyMs, latencyMs
      ]
    );
  }

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================

  /**
   * Dispatch message notification
   *
   * Convenience wrapper for message.received events
   */
  async dispatchMessageNotification(
    recipientId: number,
    senderName: string,
    messagePreview: string,
    metadata: { message_id: number; sender_user_id: number }
  ): Promise<DispatchResult> {
    return this.dispatch({
      type: 'message.received',
      recipientId,
      title: `${senderName} sent you a message`,
      message: messagePreview.substring(0, 100),
      entityType: 'user',
      entityId: metadata.sender_user_id,
      actionUrl: '/dashboard/messages',
      priority: 'normal',
      metadata,
      triggeredBy: metadata.sender_user_id
    });
  }

  /**
   * Dispatch connection request notification
   *
   * Convenience wrapper for connection.request_received events
   */
  async dispatchConnectionRequestNotification(
    recipientId: number,
    senderName: string,
    message: string | undefined,
    metadata: { request_id: number; sender_user_id: number }
  ): Promise<DispatchResult> {
    return this.dispatch({
      type: 'connection.request_received',
      recipientId,
      title: `${senderName} wants to connect`,
      message: message || 'You have a new connection request',
      entityType: 'user',
      entityId: metadata.sender_user_id,
      actionUrl: '/dashboard/connections?tab=incoming',
      priority: 'normal',
      metadata,
      triggeredBy: metadata.sender_user_id
    });
  }

  /**
   * Dispatch connection request response notification
   *
   * Convenience wrapper for connection.request_accepted/declined events
   */
  async dispatchConnectionResponseNotification(
    recipientId: number,
    responderName: string,
    accepted: boolean,
    responseMessage: string | undefined,
    metadata: { request_id: number; responder_user_id: number }
  ): Promise<DispatchResult> {
    return this.dispatch({
      type: accepted ? 'connection.request_accepted' : 'connection.request_declined',
      recipientId,
      title: accepted
        ? `${responderName} accepted your connection request`
        : `${responderName} declined your connection request`,
      message: accepted ? 'You are now connected!' : responseMessage,
      entityType: 'user',
      entityId: metadata.responder_user_id,
      actionUrl: accepted ? '/dashboard/connections' : '/dashboard/connections?tab=sent',
      priority: 'normal',
      metadata,
      triggeredBy: metadata.responder_user_id
    });
  }

  /**
   * Dispatch recommendation notification
   *
   * Convenience wrapper for recommendation.received events
   */
  async dispatchRecommendationNotification(
    recipientId: number,
    senderName: string,
    entityType: 'user' | 'listing' | 'event' | 'job_posting',
    entityTitle: string,
    metadata: {
      recommendation_id: number;
      sender_user_id: number;
      entity_type: string;
      entity_id: string;
      entity_url: string;
    }
  ): Promise<DispatchResult> {
    // Format title based on entity type
    let title: string;

    switch (entityType) {
      case 'user':
        title = `${senderName} recommended a connection to you`;
        break;
      case 'listing':
        title = `${senderName} recommended a business to you`;
        break;
      case 'event':
        title = `${senderName} recommended an event to you`;
        break;
      case 'job_posting':
        title = `${senderName} recommended a job to you`;
        break;
      default:
        title = `${senderName} sent you a recommendation`;
    }

    return this.dispatch({
      type: 'recommendation.received',
      recipientId,
      title,
      message: `Check out ${entityTitle}`,
      entityType: entityType === 'user' ? 'user' : entityType === 'listing' ? 'listing' : entityType === 'job_posting' ? 'job' : 'event',
      entityId: parseInt(metadata.entity_id),
      actionUrl: metadata.entity_url,
      priority: 'normal',
      metadata,
      triggeredBy: metadata.sender_user_id
    });
  }

  /**
   * Dispatch review received notification
   *
   * Convenience wrapper for review.received events
   */
  async dispatchReviewReceivedNotification(
    recipientId: number,
    reviewerName: string,
    rating: number,
    listingName: string,
    metadata: { review_id: number; listing_id: number; reviewer_user_id: number }
  ): Promise<DispatchResult> {
    return this.dispatch({
      type: 'review.received',
      recipientId,
      title: `${reviewerName} left a ${rating}-star review`,
      message: `New review on ${listingName}`,
      entityType: 'review',
      entityId: metadata.review_id,
      actionUrl: '/dashboard/reviews',
      priority: 'normal',
      metadata,
      triggeredBy: metadata.reviewer_user_id
    });
  }

  /**
   * Dispatch review response notification
   *
   * Convenience wrapper for review.response events
   */
  async dispatchReviewResponseNotification(
    recipientId: number,
    ownerName: string,
    responsePreview: string,
    metadata: { review_id: number; listing_id: number; owner_user_id: number; listing_slug?: string }
  ): Promise<DispatchResult> {
    return this.dispatch({
      type: 'review.response',
      recipientId,
      title: `${ownerName} responded to your review`,
      message: responsePreview.substring(0, 100),
      entityType: 'review',
      entityId: metadata.review_id,
      actionUrl: metadata.listing_slug
        ? `/listings/${metadata.listing_slug}#reviews`
        : '/dashboard/reviews',
      priority: 'normal',
      metadata,
      triggeredBy: metadata.owner_user_id
    });
  }
}
