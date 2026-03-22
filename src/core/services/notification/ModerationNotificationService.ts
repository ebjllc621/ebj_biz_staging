/**
 * ModerationNotificationService - Admin Moderation Decision Notifications
 *
 * Notifies content creators when an admin approves or rejects their submissions.
 * Handles reviews, events, and content (articles/videos/podcasts).
 * Listings are handled by ListingApprovalService + ListingNotificationService.
 *
 * Follows ContentNotificationService pattern EXACTLY:
 * - Constructor takes DatabaseService + NotificationService
 * - All methods are best-effort (try/catch with ErrorService.capture, never throw)
 * - Uses NotificationService.dispatch() for multi-channel delivery
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @reference src/core/services/notification/ContentNotificationService.ts
 * @tier STANDARD
 */

import { DatabaseService, getDatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// ModerationNotificationService
// ============================================================================

export class ModerationNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // Review Moderation Notifications
  // ==========================================================================

  /**
   * Notify review author that their review has been approved.
   * Best-effort — never throws.
   */
  async notifyReviewApproved(reviewId: number): Promise<void> {
    try {
      const review = await this.getReviewInfo(reviewId);
      if (!review) {
        ErrorService.capture('[ModerationNotificationService] notifyReviewApproved: review not found', { reviewId });
        return;
      }

      await this.notificationService.dispatch({
        type: 'review.approved',
        recipientId: review.user_id,
        title: 'Your review has been approved!',
        message: `Your review "${review.title || 'Untitled'}" for ${review.listing_name} is now live. Thank you for sharing your experience!`,
        entityType: 'review',
        entityId: reviewId,
        actionUrl: `/listings/${review.listing_slug || review.listing_id}`,
        priority: 'normal',
        metadata: {
          review_id: reviewId,
          listing_id: review.listing_id,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyReviewApproved failed:', error);
    }
  }

  /**
   * Notify review author that their review has been rejected with reason.
   * Best-effort — never throws.
   */
  async notifyReviewRejected(reviewId: number, reason: string | null): Promise<void> {
    try {
      const review = await this.getReviewInfo(reviewId);
      if (!review) {
        ErrorService.capture('[ModerationNotificationService] notifyReviewRejected: review not found', { reviewId });
        return;
      }

      const reasonText = reason || 'No specific reason provided';

      await this.notificationService.dispatch({
        type: 'review.rejected',
        recipientId: review.user_id,
        title: 'Your review was not approved',
        message: `Your review for ${review.listing_name} was not approved. Reason: ${reasonText}`,
        entityType: 'review',
        entityId: reviewId,
        actionUrl: `/listings/${review.listing_slug || review.listing_id}`,
        priority: 'normal',
        metadata: {
          review_id: reviewId,
          listing_id: review.listing_id,
          rejection_reason: reasonText,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyReviewRejected failed:', error);
    }
  }

  // ==========================================================================
  // Event Moderation Notifications
  // ==========================================================================

  /**
   * Notify event creator that their event has been approved.
   * Best-effort — never throws.
   */
  async notifyEventApproved(eventId: number): Promise<void> {
    try {
      const event = await this.getEventInfo(eventId);
      if (!event) {
        ErrorService.capture('[ModerationNotificationService] notifyEventApproved: event not found', { eventId });
        return;
      }

      if (!event.submitted_by_user_id) return;

      await this.notificationService.dispatch({
        type: 'event.moderation_approved',
        recipientId: event.submitted_by_user_id,
        title: 'Your event has been approved!',
        message: `"${event.title}" has been approved and is now published. Share it with your community!`,
        entityType: 'event',
        entityId: eventId,
        actionUrl: `/events/${event.slug || eventId}`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyEventApproved failed:', error);
    }
  }

  /**
   * Notify event creator that their event has been rejected with reason.
   * Best-effort — never throws.
   */
  async notifyEventRejected(eventId: number, reason: string | null): Promise<void> {
    try {
      const event = await this.getEventInfo(eventId);
      if (!event) {
        ErrorService.capture('[ModerationNotificationService] notifyEventRejected: event not found', { eventId });
        return;
      }

      if (!event.submitted_by_user_id) return;

      const reasonText = reason || 'No specific reason provided';

      await this.notificationService.dispatch({
        type: 'event.moderation_rejected',
        recipientId: event.submitted_by_user_id,
        title: 'Your event was not approved',
        message: `"${event.title}" was not approved for publication. Reason: ${reasonText}`,
        entityType: 'event',
        entityId: eventId,
        actionUrl: `/dashboard`,
        priority: 'normal',
        metadata: {
          event_id: eventId,
          rejection_reason: reasonText,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyEventRejected failed:', error);
    }
  }

  // ==========================================================================
  // Content Moderation Notifications (articles, videos, podcasts)
  // ==========================================================================

  /**
   * Notify content creator that their content has been approved.
   * Best-effort — never throws.
   */
  async notifyContentApproved(
    contentType: 'article' | 'video' | 'podcast',
    contentId: number
  ): Promise<void> {
    try {
      const content = await this.getContentInfo(contentType, contentId);
      if (!content) {
        ErrorService.capture('[ModerationNotificationService] notifyContentApproved: content not found', { contentType, contentId });
        return;
      }

      if (!content.owner_user_id) return;

      const typeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1);

      await this.notificationService.dispatch({
        type: 'content.moderation_approved',
        recipientId: content.owner_user_id,
        title: `Your ${typeLabel.toLowerCase()} has been approved!`,
        message: `"${content.title}" has been approved and is now published.`,
        entityType: 'content',
        entityId: contentId,
        actionUrl: `/${contentType}s/${content.slug || contentId}`,
        priority: 'normal',
        metadata: {
          content_type: contentType,
          content_id: contentId,
          listing_id: content.listing_id,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyContentApproved failed:', error);
    }
  }

  /**
   * Notify content creator that their content has been rejected with reason.
   * Best-effort — never throws.
   */
  async notifyContentRejected(
    contentType: 'article' | 'video' | 'podcast',
    contentId: number,
    reason: string | null
  ): Promise<void> {
    try {
      const content = await this.getContentInfo(contentType, contentId);
      if (!content) {
        ErrorService.capture('[ModerationNotificationService] notifyContentRejected: content not found', { contentType, contentId });
        return;
      }

      if (!content.owner_user_id) return;

      const typeLabel = contentType.charAt(0).toUpperCase() + contentType.slice(1);
      const reasonText = reason || 'No specific reason provided';

      await this.notificationService.dispatch({
        type: 'content.moderation_rejected',
        recipientId: content.owner_user_id,
        title: `Your ${typeLabel.toLowerCase()} was not approved`,
        message: `"${content.title}" was not approved. Reason: ${reasonText}`,
        entityType: 'content',
        entityId: contentId,
        actionUrl: `/dashboard`,
        priority: 'normal',
        metadata: {
          content_type: contentType,
          content_id: contentId,
          listing_id: content.listing_id,
          rejection_reason: reasonText,
        },
      });
    } catch (error) {
      ErrorService.capture('[ModerationNotificationService] notifyContentRejected failed:', error);
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getReviewInfo(reviewId: number): Promise<{
    user_id: number;
    title: string | null;
    listing_id: number;
    listing_name: string;
    listing_slug: string | null;
  } | null> {
    const result = await this.db.query<{
      user_id: number;
      title: string | null;
      listing_id: number;
      listing_name: string;
      listing_slug: string | null;
    }>(
      `SELECT r.user_id, r.title, r.listing_id,
              l.name AS listing_name, l.slug AS listing_slug
       FROM reviews r
       JOIN listings l ON l.id = r.listing_id
       WHERE r.id = ? LIMIT 1`,
      [reviewId]
    );
    return result.rows[0] || null;
  }

  private async getEventInfo(eventId: number): Promise<{
    title: string;
    slug: string | null;
    submitted_by_user_id: number | null;
  } | null> {
    const result = await this.db.query<{
      title: string;
      slug: string | null;
      submitted_by_user_id: number | null;
    }>(
      'SELECT title, slug, submitted_by_user_id FROM events WHERE id = ? LIMIT 1',
      [eventId]
    );
    return result.rows[0] || null;
  }

  private async getContentInfo(
    contentType: 'article' | 'video' | 'podcast',
    contentId: number
  ): Promise<{
    title: string;
    slug: string | null;
    listing_id: number | null;
    owner_user_id: number | null;
  } | null> {
    const tableMap: Record<string, string> = {
      article: 'content_articles',
      video: 'content_videos',
      podcast: 'content_podcasts',
    };
    const table = tableMap[contentType];

    const result = await this.db.query<{
      title: string;
      slug: string | null;
      listing_id: number | null;
    }>(
      `SELECT title, slug, listing_id FROM ${table} WHERE id = ? LIMIT 1`,
      [contentId]
    );

    if (!result.rows[0]) return null;
    const content = result.rows[0];

    // Resolve listing owner as the content creator
    let ownerUserId: number | null = null;
    if (content.listing_id) {
      const listingResult = await this.db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [content.listing_id]
      );
      ownerUserId = listingResult.rows[0]?.user_id || null;
    }

    return {
      ...content,
      owner_user_id: ownerUserId,
    };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: ModerationNotificationService | null = null;

export function getModerationNotificationService(): ModerationNotificationService {
  if (!instance) {
    const db = getDatabaseService();
    // Lazy import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getNotificationService } = require('@core/services/ServiceRegistry');
    instance = new ModerationNotificationService(db, getNotificationService());
  }
  return instance;
}

export default ModerationNotificationService;
