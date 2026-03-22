/**
 * MessageService - User-to-User Messaging Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_1_CORE_INFRASTRUCTURE_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/services/ConnectionService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import {
  SendMessageInput,
  Message,
  MessageThread,
  UpdateMessageInput,
  MessageStats
} from '../types';
import { bigIntToNumber } from '@core/utils/bigint';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Custom Errors
// ============================================================================

export class MessageError extends BizError {
  constructor(message: string) {
    super({ code: 'MESSAGE_ERROR', message, userMessage: message });
    this.name = 'MessageError';
  }
}

export class MessageNotFoundError extends BizError {
  constructor(message = 'Message not found') {
    super({ code: 'MESSAGE_NOT_FOUND', message, userMessage: message });
    this.name = 'MessageNotFoundError';
  }
}

// ============================================================================
// MessageService Implementation
// ============================================================================

export class MessageService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService?: NotificationService) {
    this.db = db;
    // Default to creating NotificationService if not provided (backward compatible)
    this.notificationService = notificationService || new NotificationService(db);
  }

  // ==========================================================================
  // Message Operations
  // ==========================================================================

  /**
   * Send a new message
   * @param input Message details
   * @returns Created message with sender/receiver info
   * @note Respects receiver's allowDirectMessages visibility setting
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    const { sender_user_id, receiver_user_id, subject, content, message_type, reply_to_id, metadata } = input;

    // Validate: Cannot message self
    if (sender_user_id === receiver_user_id) {
      throw new MessageError('Cannot send message to yourself');
    }

    // Check if receiver allows direct messages
    const receiverResult: DbResult<{ visibility_settings: string | null }> = await this.db.query(
      'SELECT visibility_settings FROM users WHERE id = ?',
      [receiver_user_id]
    );

    const receiverRow = receiverResult.rows[0];
    if (receiverRow?.visibility_settings) {
      try {
        const settings = JSON.parse(receiverRow.visibility_settings);
        if (settings.allowDirectMessages === false) {
          throw new MessageError('This user does not accept direct messages');
        }
      } catch (e) {
        // If JSON parse fails but not a MessageError, allow messaging (default behavior)
        if (e instanceof MessageError) {
          throw e;
        }
      }
    }

    // Generate deterministic thread ID
    const thread_id = this.generateThreadId(sender_user_id, receiver_user_id);

    // Create message
    const result = await this.db.query(
      `INSERT INTO user_message
       (sender_user_id, receiver_user_id, subject, content, message_type, thread_id, reply_to_id, metadata, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`,
      [
        sender_user_id,
        receiver_user_id,
        subject || null,
        content,
        message_type || 'text',
        thread_id,
        reply_to_id || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const messageId = result.insertId;

    // Fetch created message with sender/receiver profile info
    const messageResult: DbResult<Message> = await this.db.query(
      `SELECT
        m.id,
        m.sender_user_id,
        m.receiver_user_id,
        m.subject,
        m.content,
        m.message_type,
        m.attachments,
        m.metadata,
        m.status,
        m.read_at,
        m.thread_id,
        m.reply_to_id,
        m.created_at,
        m.updated_at,
        sender.username AS sender_username,
        sender.display_name AS sender_display_name,
        sender.avatar_url AS sender_avatar_url,
        receiver.username AS receiver_username,
        receiver.display_name AS receiver_display_name,
        receiver.avatar_url AS receiver_avatar_url
      FROM user_message m
      JOIN users sender ON m.sender_user_id = sender.id
      JOIN users receiver ON m.receiver_user_id = receiver.id
      WHERE m.id = ?`,
      [messageId]
    );

    if (!messageResult.rows[0]) {
      throw new MessageNotFoundError('Failed to retrieve created message');
    }

    const createdMessage = messageResult.rows[0];

    // Create notification for the receiver
    await this.notificationService.dispatchMessageNotification(
      receiver_user_id,
      createdMessage.sender_display_name || createdMessage.sender_username || 'Someone',
      content,
      { message_id: createdMessage.id, sender_user_id: sender_user_id }
    );

    // Create social activity for SENDER (their own view - "I sent a message")
    await this.createSocialActivity(
      sender_user_id,
      sender_user_id, // target is self for sender's activity log
      'message',
      'Message sent',
      `Sent a message to ${createdMessage.receiver_display_name || createdMessage.receiver_username}`,
      'private',
      { thread_id: thread_id, direction: 'sent' }
    );

    // Create social activity for RECEIVER (their view - "I received a message")
    await this.createSocialActivity(
      sender_user_id, // creator is still the sender
      receiver_user_id, // target is receiver for their activity log
      'message',
      'Message received',
      `Received a message from ${createdMessage.sender_display_name || createdMessage.sender_username}`,
      'private',
      { thread_id: thread_id, direction: 'received' }
    );

    return createdMessage;
  }

  /**
   * Get a specific message by ID
   * @param messageId Message ID
   * @param userId User ID (must be sender or receiver)
   * @returns Message with profile info
   */
  async getMessageById(messageId: number, userId: number): Promise<Message | null> {
    const result: DbResult<Message> = await this.db.query(
      `SELECT
        m.id,
        m.sender_user_id,
        m.receiver_user_id,
        m.subject,
        m.content,
        m.message_type,
        m.attachments,
        m.metadata,
        m.status,
        m.read_at,
        m.thread_id,
        m.reply_to_id,
        m.created_at,
        m.updated_at,
        sender.username AS sender_username,
        sender.display_name AS sender_display_name,
        sender.avatar_url AS sender_avatar_url,
        receiver.username AS receiver_username,
        receiver.display_name AS receiver_display_name,
        receiver.avatar_url AS receiver_avatar_url
      FROM user_message m
      JOIN users sender ON m.sender_user_id = sender.id
      JOIN users receiver ON m.receiver_user_id = receiver.id
      WHERE m.id = ?
        AND (m.sender_user_id = ? OR m.receiver_user_id = ?)
        AND m.status != 'deleted'`,
      [messageId, userId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get message threads for a user (inbox view)
   * @param userId User ID
   * @returns Array of thread summaries
   */
  async getUserThreads(userId: number): Promise<MessageThread[]> {
    const result: DbResult<any> = await this.db.query(
      `SELECT
        m.thread_id,
        CASE
          WHEN m.sender_user_id = ? THEN m.receiver_user_id
          ELSE m.sender_user_id
        END AS other_user_id,
        CASE
          WHEN m.sender_user_id = ? THEN receiver.username
          ELSE sender.username
        END AS other_username,
        CASE
          WHEN m.sender_user_id = ? THEN receiver.display_name
          ELSE sender.display_name
        END AS other_display_name,
        CASE
          WHEN m.sender_user_id = ? THEN receiver.avatar_url
          ELSE sender.avatar_url
        END AS other_avatar_url,
        m.content AS last_message_content,
        m.created_at AS last_message_at,
        (
          SELECT COUNT(*)
          FROM user_message m2
          WHERE m2.thread_id = m.thread_id
            AND m2.receiver_user_id = ?
            AND m2.status != 'read'
            AND m2.status != 'deleted'
        ) AS unread_count,
        (
          SELECT COUNT(*)
          FROM user_message m3
          WHERE m3.thread_id = m.thread_id
            AND m3.status != 'deleted'
        ) AS total_messages
      FROM user_message m
      JOIN users sender ON m.sender_user_id = sender.id
      JOIN users receiver ON m.receiver_user_id = receiver.id
      WHERE (m.sender_user_id = ? OR m.receiver_user_id = ?)
        AND m.status != 'deleted'
        AND m.id = (
          SELECT MAX(id)
          FROM user_message
          WHERE thread_id = m.thread_id
            AND status != 'deleted'
        )
      ORDER BY m.created_at DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    // GOVERNANCE: mariadb returns BigInt for COUNT(*) subqueries - must convert to Number
    return result.rows.map((row: any) => ({
      ...row,
      unread_count: bigIntToNumber(row.unread_count),
      total_messages: bigIntToNumber(row.total_messages)
    })) as MessageThread[];
  }

  /**
   * Get conversation between two users
   * @param userId Current user ID
   * @param otherUserId Other user ID
   * @param limit Max messages to return (default: 50)
   * @param offset Offset for pagination (default: 0)
   * @returns Array of messages in conversation
   */
  async getConversation(
    userId: number,
    otherUserId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const thread_id = this.generateThreadId(userId, otherUserId);

    const result: DbResult<Message> = await this.db.query(
      `SELECT
        m.id,
        m.sender_user_id,
        m.receiver_user_id,
        m.subject,
        m.content,
        m.message_type,
        m.attachments,
        m.metadata,
        m.status,
        m.read_at,
        m.thread_id,
        m.reply_to_id,
        m.created_at,
        m.updated_at,
        sender.username AS sender_username,
        sender.display_name AS sender_display_name,
        sender.avatar_url AS sender_avatar_url,
        receiver.username AS receiver_username,
        receiver.display_name AS receiver_display_name,
        receiver.avatar_url AS receiver_avatar_url
      FROM user_message m
      JOIN users sender ON m.sender_user_id = sender.id
      JOIN users receiver ON m.receiver_user_id = receiver.id
      WHERE m.thread_id = ?
        AND m.status != 'deleted'
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
      [thread_id, limit, offset]
    );

    return result.rows;
  }

  /**
   * Mark a message as read
   * @param messageId Message ID
   * @param userId User ID (must be receiver)
   */
  async markAsRead(messageId: number, userId: number): Promise<void> {
    // Verify user is the receiver
    const message = await this.getMessageById(messageId, userId);
    if (!message) {
      throw new MessageNotFoundError();
    }

    if (message.receiver_user_id !== userId) {
      throw new MessageError('Only the message receiver can mark as read');
    }

    if (message.status === 'read') {
      return; // Already read
    }

    await this.db.query(
      `UPDATE user_message
       SET status = 'read', read_at = NOW()
       WHERE id = ?`,
      [messageId]
    );
  }

  /**
   * Mark all messages in a thread as read
   * @param userId Current user ID (receiver)
   * @param otherUserId Other user ID
   */
  async markThreadAsRead(userId: number, otherUserId: number): Promise<void> {
    const thread_id = this.generateThreadId(userId, otherUserId);

    await this.db.query(
      `UPDATE user_message
       SET status = 'read', read_at = NOW()
       WHERE thread_id = ?
         AND receiver_user_id = ?
         AND status != 'read'
         AND status != 'deleted'`,
      [thread_id, userId]
    );
  }

  /**
   * Delete a message (soft delete)
   * @param messageId Message ID
   * @param userId User ID (must be sender or receiver)
   */
  async deleteMessage(messageId: number, userId: number): Promise<void> {
    // Verify user is sender or receiver
    const message = await this.getMessageById(messageId, userId);
    if (!message) {
      throw new MessageNotFoundError();
    }

    if (message.sender_user_id !== userId && message.receiver_user_id !== userId) {
      throw new MessageError('Not authorized to delete this message');
    }

    await this.db.query(
      `UPDATE user_message
       SET status = 'deleted'
       WHERE id = ?`,
      [messageId]
    );
  }

  /**
   * Get unread message count for a user
   * @param userId User ID
   * @returns Unread message count
   */
  async getUnreadCount(userId: number): Promise<number> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count
       FROM user_message
       WHERE receiver_user_id = ?
         AND status != 'read'
         AND status != 'deleted'`,
      [userId]
    );

    return bigIntToNumber(result.rows[0]?.count);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Create social activity record for the activity feed
   * @param creatorUserId User who performed the action
   * @param targetUserId User who was the target of the action (optional)
   * @param activityType Type of activity (message, etc.)
   * @param title Activity title
   * @param description Activity description
   * @param visibility Visibility level (default: private for messages)
   * @param metadata Optional additional metadata
   */
  private async createSocialActivity(
    creatorUserId: number,
    targetUserId: number | null,
    activityType: string,
    title: string,
    description: string,
    visibility: 'public' | 'connections' | 'private' = 'private',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO social_activity
         (creator_user_id, target_user_id, activity_type, title, description, visibility, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [creatorUserId, targetUserId, activityType, title, description, visibility, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (error) {
      // Non-blocking: Log but don't fail the main operation
      ErrorService.capture('Failed to create social activity:', error);
    }
  }

  /**
   * Generate deterministic thread ID for two users
   * Always puts smaller user ID first to ensure consistency
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @returns Thread ID
   */
  private generateThreadId(userIdA: number, userIdB: number): string {
    const sortedIds = [userIdA, userIdB].sort((a, b) => a - b);
    return `thread_${sortedIds[0]}_${sortedIds[1]}`;
  }

  /**
   * Create notification for message event
   * Uses user_notifications table with correct schema
   * @deprecated Use NotificationService.dispatchMessageNotification() instead
   * @param userId User to notify
   * @param type Notification type (message, etc.)
   * @param title Notification title
   * @param message Optional notification message
   * @param actionUrl Optional URL for notification action
   * @param metadata Optional additional metadata
   */
  private async createNotification(
    userId: number,
    type: string,
    title: string,
    message?: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, action_url, metadata, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [userId, type, title, message || null, actionUrl || null, metadata ? JSON.stringify(metadata) : null]
    );
  }
}
