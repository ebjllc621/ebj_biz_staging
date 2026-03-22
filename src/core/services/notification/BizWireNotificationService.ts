/**
 * BizWireNotificationService - BizWire Contact Messaging Notification Dispatch
 *
 * Coordinates BizWire contact messaging notifications with NotificationService.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService.capture(), never throw (best-effort)
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/components/contactListing/phases/PHASE_1_PLAN.md
 * @tier ADVANCED
 * @reference src/core/services/notification/EventNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Types
// ============================================================================

export interface BizWireNotificationResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// BizWireNotificationService
// ============================================================================

export class BizWireNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  // ==========================================================================
  // Message Notifications
  // ==========================================================================

  /**
   * Notify listing owner(s) when a new BizWire message is received
   */
  async notifyNewMessage(
    messageId: number,
    listingId: number,
    senderUserId: number
  ): Promise<BizWireNotificationResult> {
    try {
      // Get listing owner
      const listingResult = await this.db.query<{
        user_id: number;
        name: string;
        slug: string | null;
      }>(
        'SELECT user_id, name, slug FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        ErrorService.capture('[BizWireNotificationService] notifyNewMessage failed: listing not found', { listingId });
        return { success: false, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0]!;

      // Get sender info
      const senderResult = await this.db.query<{
        first_name: string;
        last_name: string;
      }>(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [senderUserId]
      );

      const sender = senderResult.rows[0];
      const senderName = sender
        ? `${sender.first_name} ${sender.last_name}`.trim()
        : 'A user';

      await this.notificationService.dispatch({
        type: 'bizwire.message_received',
        recipientId: listing.user_id,
        title: `New BizWire message for ${listing.name}`,
        message: `${senderName} sent you a message`,
        entityType: 'listing',
        entityId: listingId,
        actionUrl: `/dashboard/listings/${listingId}/bizwire`,
        priority: 'normal',
        triggeredBy: senderUserId,
        metadata: { message_id: messageId, listing_id: listingId }
      });

      return { success: true };
    } catch (error) {
      ErrorService.capture('[BizWireNotificationService] notifyNewMessage failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Notify the other participant when a reply is sent in a BizWire thread
   */
  async notifyReply(
    messageId: number,
    threadId: string,
    listingId: number,
    replierUserId: number
  ): Promise<BizWireNotificationResult> {
    try {
      // Get listing owner
      const listingResult = await this.db.query<{
        user_id: number;
        name: string;
      }>(
        'SELECT user_id, name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) {
        ErrorService.capture('[BizWireNotificationService] notifyReply failed: listing not found', { listingId });
        return { success: false, error: 'Listing not found' };
      }

      const listing = listingResult.rows[0]!;

      // Get thread's original sender
      const threadResult = await this.db.query<{ sender_user_id: number }>(
        'SELECT sender_user_id FROM listing_messages WHERE thread_id = ? ORDER BY created_at ASC LIMIT 1',
        [threadId]
      );

      if (threadResult.rows.length === 0) {
        return { success: false, error: 'Thread not found' };
      }

      const originalSender = threadResult.rows[0]!;

      // Determine recipient: if replier is listing owner, notify original sender; otherwise notify listing owner
      const recipientId = replierUserId === listing.user_id
        ? originalSender.sender_user_id
        : listing.user_id;

      // Get replier info
      const replierResult = await this.db.query<{
        first_name: string;
        last_name: string;
      }>(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [replierUserId]
      );

      const replier = replierResult.rows[0];
      const replierName = replier
        ? `${replier.first_name} ${replier.last_name}`.trim()
        : 'Someone';

      await this.notificationService.dispatch({
        type: 'bizwire.reply_received',
        recipientId,
        title: `New reply on BizWire conversation`,
        message: `${replierName} replied to your message about ${listing.name}`,
        entityType: 'listing',
        entityId: listingId,
        actionUrl: recipientId === listing.user_id
          ? `/dashboard/listings/${listingId}/bizwire`
          : `/dashboard/bizwire`,
        priority: 'normal',
        triggeredBy: replierUserId,
        metadata: { message_id: messageId, thread_id: threadId, listing_id: listingId }
      });

      return { success: true };
    } catch (error) {
      ErrorService.capture('[BizWireNotificationService] notifyReply failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Notify original sender when listing owner reads their message
   */
  async notifyMessageRead(messageId: number): Promise<BizWireNotificationResult> {
    try {
      const msgResult = await this.db.query<{
        sender_user_id: number;
        listing_id: number;
      }>(
        'SELECT sender_user_id, listing_id FROM listing_messages WHERE id = ?',
        [messageId]
      );

      if (msgResult.rows.length === 0) {
        return { success: false, error: 'Message not found' };
      }

      const msg = msgResult.rows[0]!;

      const listingResult = await this.db.query<{
        name: string;
      }>(
        'SELECT name FROM listings WHERE id = ?',
        [msg.listing_id]
      );

      const listing = listingResult.rows[0];
      const listingName = listing?.name || 'a business';

      await this.notificationService.dispatch({
        type: 'bizwire.message_read',
        recipientId: msg.sender_user_id,
        title: `Your BizWire message was read`,
        message: `${listingName} read your message`,
        entityType: 'listing',
        entityId: msg.listing_id,
        actionUrl: `/dashboard/bizwire`,
        priority: 'low',
        metadata: { message_id: messageId, listing_id: msg.listing_id }
      });

      return { success: true };
    } catch (error) {
      ErrorService.capture('[BizWireNotificationService] notifyMessageRead failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default BizWireNotificationService;
