/**
 * ListingMessageService - Business Inquiry Inbox Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: Extends BizError for custom errors
 * - Build Map v2.1 ENHANCED patterns
 * - Data isolation: listing_id context (not user_id)
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 9 Brain Plan - Communication/Reputation Pages
 * @reference CategoryService.ts - Service architecture pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';
import { generateId } from '@/lib/util/id';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ListingMessage {
  id: number;
  listing_id: number;
  sender_user_id: number;
  subject: string | null;
  content: string;
  message_type: MessageType;
  is_read: boolean;
  read_at: Date | null;
  reply_id: number | null;
  thread_id: string | null;
  status: MessageStatus;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface ListingMessageWithSender extends ListingMessage {
  sender_first_name: string | null;
  sender_last_name: string | null;
  sender_email: string;
  sender_avatar_url: string | null;
}

export type MessageType = 'inquiry' | 'quote_request' | 'appointment' | 'feedback' | 'other';
export type MessageStatus = 'new' | 'read' | 'replied' | 'archived';

export interface CreateMessageInput {
  subject?: string;
  content: string;
  message_type?: MessageType;
  thread_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMessageInput {
  status?: MessageStatus;
  is_read?: boolean;
}

export interface MessageFilters {
  status?: MessageStatus;
  message_type?: MessageType;
  is_read?: boolean;
  thread_id?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateBizWireMessageInput extends CreateMessageInput {
  source_page?: string;
  source_url?: string;
}

export interface BizWireThreadSummary {
  thread_id: string;
  listing_id: number;
  listing_name: string;
  listing_slug: string;
  listing_logo: string | null;
  subject: string | null;
  last_message_content: string;
  last_message_sender_id: number;
  last_message_sender_name: string;
  last_message_date: string;
  message_count: number;
  unread_count: number;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class MessageNotFoundError extends BizError {
  constructor(messageId: number) {
    super({
      code: 'MESSAGE_NOT_FOUND',
      message: `Message not found: ${messageId}`,
      context: { messageId },
      userMessage: 'The requested message was not found'
    });
  }
}

export class UnauthorizedMessageAccessError extends BizError {
  constructor(messageId: number, userId: number) {
    super({
      code: 'UNAUTHORIZED_MESSAGE_ACCESS',
      message: `User ${userId} is not authorized to access message ${messageId}`,
      context: { messageId, userId },
      userMessage: 'You do not have permission to access this message'
    });
  }
}

// ============================================================================
// ListingMessageService Implementation
// ============================================================================

export class ListingMessageService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // READ Operations
  // ==========================================================================

  /**
   * Get messages for a specific listing with pagination and filters
   * @param listingId - Listing ID
   * @param filters - Optional filters
   * @param pagination - Pagination params
   * @returns Paginated messages with sender info
   */
  async getMessagesByListing(
    listingId: number,
    filters?: MessageFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResult<ListingMessageWithSender>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        lm.*,
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar_url
      FROM listing_messages lm
      JOIN users u ON lm.sender_user_id = u.id
      WHERE lm.listing_id = ?
    `;

    const params: unknown[] = [listingId];

    // Apply filters
    if (filters) {
      if (filters.status) {
        sql += ' AND lm.status = ?';
        params.push(filters.status);
      }
      if (filters.message_type) {
        sql += ' AND lm.message_type = ?';
        params.push(filters.message_type);
      }
      if (filters.is_read !== undefined) {
        sql += ' AND lm.is_read = ?';
        params.push(filters.is_read);
      }
      if (filters.thread_id) {
        sql += ' AND lm.thread_id = ?';
        params.push(filters.thread_id);
      }
    }

    sql += ' ORDER BY lm.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result: DbResult<ListingMessageWithSender> = await this.db.query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM listing_messages WHERE listing_id = ?';
    const countParams: unknown[] = [listingId];

    if (filters) {
      if (filters.status) {
        countSql += ' AND status = ?';
        countParams.push(filters.status);
      }
      if (filters.message_type) {
        countSql += ' AND message_type = ?';
        countParams.push(filters.message_type);
      }
      if (filters.is_read !== undefined) {
        countSql += ' AND is_read = ?';
        countParams.push(filters.is_read);
      }
      if (filters.thread_id) {
        countSql += ' AND thread_id = ?';
        countParams.push(filters.thread_id);
      }
    }

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, countParams);
    const total = bigIntToNumber(countResult.rows[0]?.total || 0);

    return {
      data: (result.rows || []).map((msg: ListingMessageWithSender) => ({
        ...msg,
        metadata: msg.metadata ? safeJsonParse(msg.metadata, {}) : null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single message by ID
   * @param messageId - Message ID
   * @returns Message with sender info
   */
  async getMessageById(messageId: number): Promise<ListingMessageWithSender> {
    const sql = `
      SELECT
        lm.*,
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar_url
      FROM listing_messages lm
      JOIN users u ON lm.sender_user_id = u.id
      WHERE lm.id = ?
    `;

    const result: DbResult<ListingMessageWithSender> = await this.db.query(sql, [messageId]);

    const message = result.rows[0];
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }

    return {
      ...message,
      metadata: message.metadata ? safeJsonParse(message.metadata, {}) : null
    };
  }

  /**
   * Get unread message count for a listing
   * @param listingId - Listing ID
   * @returns Unread message count
   */
  async getUnreadCount(listingId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM listing_messages WHERE listing_id = ? AND is_read = 0';
    const result: DbResult<{ count: bigint | number }> = await this.db.query(sql, [listingId]);
    return bigIntToNumber(result.rows[0]?.count || 0);
  }

  // ==========================================================================
  // CREATE Operations
  // ==========================================================================

  /**
   * Create a new message (sent by user TO listing)
   * @param listingId - Listing ID receiving the message
   * @param senderId - User ID sending the message
   * @param input - Message data
   * @returns Created message ID
   */
  async createMessage(
    listingId: number,
    senderId: number,
    input: CreateMessageInput
  ): Promise<number> {
    // Generate thread_id if not provided
    const threadId = input.thread_id || `thread_${listingId}_${Date.now()}`;

    const sql = `
      INSERT INTO listing_messages (
        listing_id, sender_user_id, subject, content, message_type, thread_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      listingId,
      senderId,
      input.subject || null,
      input.content,
      input.message_type || 'inquiry',
      threadId,
      input.metadata ? JSON.stringify(input.metadata) : null
    ];

    const result = await this.db.query(sql, params) as DbResult;
    return Number(result.insertId);
  }

  /**
   * Reply to a message
   * @param parentMessageId - Parent message ID
   * @param listingId - Listing ID (for authorization)
   * @param senderId - User ID sending reply
   * @param content - Reply content
   * @returns Created reply message ID
   */
  async replyToMessage(
    parentMessageId: number,
    listingId: number,
    senderId: number,
    content: string
  ): Promise<number> {
    // Get parent message to verify listing and get thread_id
    const parentMessage = await this.getMessageById(parentMessageId);

    if (parentMessage.listing_id !== listingId) {
      throw new UnauthorizedMessageAccessError(parentMessageId, senderId);
    }

    const sql = `
      INSERT INTO listing_messages (
        listing_id, sender_user_id, content, reply_id, thread_id, message_type
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      listingId,
      senderId,
      content,
      parentMessageId,
      parentMessage.thread_id,
      'inquiry' // Replies inherit type from parent or default to inquiry
    ];

    const result = await this.db.query(sql, params) as DbResult;
    const replyId = Number(result.insertId);

    // Mark parent as replied
    await this.updateMessage(parentMessageId, { status: 'replied' });

    return replyId;
  }

  // ==========================================================================
  // UPDATE Operations
  // ==========================================================================

  /**
   * Update message status/read state
   * @param messageId - Message ID
   * @param input - Update data
   */
  async updateMessage(messageId: number, input: UpdateMessageInput): Promise<void> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      setClauses.push('status = ?');
      params.push(input.status);
    }

    if (input.is_read !== undefined) {
      setClauses.push('is_read = ?');
      params.push(input.is_read);

      if (input.is_read) {
        setClauses.push('read_at = NOW()');
      }
    }

    if (setClauses.length === 0) {
      return; // Nothing to update
    }

    params.push(messageId);
    const sql = `UPDATE listing_messages SET ${setClauses.join(', ')} WHERE id = ?`;

    await this.db.query(sql, params);
  }

  /**
   * Mark message as read
   * @param messageId - Message ID
   */
  async markAsRead(messageId: number): Promise<void> {
    await this.updateMessage(messageId, { is_read: true });
  }

  // ==========================================================================
  // DELETE Operations
  // ==========================================================================

  /**
   * Archive a message (soft delete)
   * @param messageId - Message ID
   */
  async archiveMessage(messageId: number): Promise<void> {
    await this.updateMessage(messageId, { status: 'archived' });
  }

  /**
   * Delete a message (hard delete)
   * @param messageId - Message ID
   */
  async deleteMessage(messageId: number): Promise<void> {
    const sql = 'DELETE FROM listing_messages WHERE id = ?';
    await this.db.query(sql, [messageId]);
  }

  // ==========================================================================
  // Authorization Helpers
  // ==========================================================================

  /**
   * Verify user owns the listing associated with a message
   * @param messageId - Message ID
   * @param userId - User ID to verify
   * @returns True if user owns the listing
   */
  async verifyListingOwnership(messageId: number, userId: number): Promise<boolean> {
    const sql = `
      SELECT l.user_id
      FROM listing_messages lm
      JOIN listings l ON lm.listing_id = l.id
      WHERE lm.id = ?
    `;

    const result: DbResult<{ user_id: number }> = await this.db.query(sql, [messageId]);
    const row = result.rows[0];

    if (!row) {
      return false;
    }

    return row.user_id === userId;
  }

  // ==========================================================================
  // BizWire Operations
  // ==========================================================================

  /**
   * Create a new BizWire message with source tracking
   */
  async createBizWireMessage(
    listingId: number,
    senderId: number,
    input: CreateBizWireMessageInput
  ): Promise<number> {
    const threadId = generateId();

    const sql = `
      INSERT INTO listing_messages (
        listing_id, sender_user_id, subject, content, message_type,
        thread_id, metadata, source_page, source_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      listingId,
      senderId,
      input.subject || null,
      input.content,
      input.message_type || 'inquiry',
      threadId,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.source_page || null,
      input.source_url || null
    ];

    const result = await this.db.query(sql, params) as DbResult;
    return Number(result.insertId);
  }

  /**
   * Get full thread conversation by thread_id
   */
  async getThread(threadId: string): Promise<ListingMessageWithSender[]> {
    const sql = `
      SELECT
        lm.*,
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar_url
      FROM listing_messages lm
      JOIN users u ON lm.sender_user_id = u.id
      WHERE lm.thread_id = ?
      ORDER BY lm.created_at ASC
    `;

    const result: DbResult<ListingMessageWithSender> = await this.db.query(sql, [threadId]);
    return (result.rows || []).map((msg: ListingMessageWithSender) => ({
      ...msg,
      metadata: msg.metadata ? safeJsonParse(msg.metadata, {}) : null
    }));
  }

  /**
   * Get BizWire thread summaries for a listing (listing owner view)
   */
  async getListingBizWireThreads(
    listingId: number,
    filters?: { status?: MessageStatus; search?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<BizWireThreadSummary>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClauses = 'lm.listing_id = ?';
    const params: unknown[] = [listingId];

    if (filters?.status) {
      whereClauses += ' AND lm.status = ?';
      params.push(filters.status);
    }

    if (filters?.search) {
      whereClauses += ' AND (lm.subject LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const sql = `
      SELECT
        lm.thread_id,
        lm.listing_id,
        l.name AS listing_name,
        l.slug AS listing_slug,
        l.logo_url AS listing_logo,
        sub.subject,
        last_msg.content AS last_message_content,
        last_msg.sender_user_id AS last_message_sender_id,
        CONCAT(last_u.first_name, ' ', last_u.last_name) AS last_message_sender_name,
        last_msg.created_at AS last_message_date,
        COUNT(lm.id) AS message_count,
        SUM(CASE WHEN lm.is_read = 0 THEN 1 ELSE 0 END) AS unread_count,
        MIN(lm.status) AS status,
        MIN(lm.created_at) AS created_at,
        MAX(lm.created_at) AS updated_at
      FROM listing_messages lm
      JOIN users u ON lm.sender_user_id = u.id
      JOIN listings l ON lm.listing_id = l.id
      JOIN (
        SELECT thread_id, MIN(subject) AS subject
        FROM listing_messages
        WHERE subject IS NOT NULL
        GROUP BY thread_id
      ) sub ON lm.thread_id = sub.thread_id
      JOIN (
        SELECT m1.thread_id, m1.content, m1.sender_user_id, m1.created_at
        FROM listing_messages m1
        INNER JOIN (
          SELECT thread_id, MAX(created_at) AS max_created
          FROM listing_messages
          GROUP BY thread_id
        ) m2 ON m1.thread_id = m2.thread_id AND m1.created_at = m2.max_created
      ) last_msg ON lm.thread_id = last_msg.thread_id
      JOIN users last_u ON last_msg.sender_user_id = last_u.id
      WHERE ${whereClauses}
      GROUP BY lm.thread_id, lm.listing_id, l.name, l.slug, l.logo_url,
               sub.subject, last_msg.content, last_msg.sender_user_id,
               last_u.first_name, last_u.last_name, last_msg.created_at
      ORDER BY last_msg.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const result: DbResult<BizWireThreadSummary> = await this.db.query(sql, params);

    // Get total thread count
    const countSql = `
      SELECT COUNT(DISTINCT lm.thread_id) AS total
      FROM listing_messages lm
      JOIN users u ON lm.sender_user_id = u.id
      WHERE ${whereClauses}
    `;
    // Remove limit/offset params for count query
    const countParams = params.slice(0, params.length - 2);

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, countParams);
    const total = bigIntToNumber(countResult.rows[0]?.total || 0);

    return {
      data: (result.rows || []).map((row) => ({
        ...row,
        message_count: bigIntToNumber(row.message_count),
        unread_count: bigIntToNumber(row.unread_count)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get BizWire thread summaries for a user (user perspective - threads they initiated)
   */
  async getUserBizWireThreads(
    userId: number,
    filters?: { status?: string; search?: string },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<BizWireThreadSummary>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;

    // Find threads where user is a participant (sent original message OR received reply)
    let whereClauses = `lm.thread_id IN (
      SELECT DISTINCT thread_id FROM listing_messages WHERE sender_user_id = ?
    )`;
    const params: unknown[] = [userId];

    if (filters?.search) {
      whereClauses += ' AND (lm.subject LIKE ? OR l.name LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern);
    }

    const sql = `
      SELECT
        lm.thread_id,
        lm.listing_id,
        l.name AS listing_name,
        l.slug AS listing_slug,
        l.logo_url AS listing_logo,
        sub.subject,
        last_msg.content AS last_message_content,
        last_msg.sender_user_id AS last_message_sender_id,
        CONCAT(last_u.first_name, ' ', last_u.last_name) AS last_message_sender_name,
        last_msg.created_at AS last_message_date,
        COUNT(lm.id) AS message_count,
        SUM(CASE WHEN lm.is_read = 0 AND lm.sender_user_id != ? THEN 1 ELSE 0 END) AS unread_count,
        MIN(lm.status) AS status,
        MIN(lm.created_at) AS created_at,
        MAX(lm.created_at) AS updated_at
      FROM listing_messages lm
      JOIN listings l ON lm.listing_id = l.id
      JOIN (
        SELECT thread_id, MIN(subject) AS subject
        FROM listing_messages
        WHERE subject IS NOT NULL
        GROUP BY thread_id
      ) sub ON lm.thread_id = sub.thread_id
      JOIN (
        SELECT m1.thread_id, m1.content, m1.sender_user_id, m1.created_at
        FROM listing_messages m1
        INNER JOIN (
          SELECT thread_id, MAX(created_at) AS max_created
          FROM listing_messages
          GROUP BY thread_id
        ) m2 ON m1.thread_id = m2.thread_id AND m1.created_at = m2.max_created
      ) last_msg ON lm.thread_id = last_msg.thread_id
      JOIN users last_u ON last_msg.sender_user_id = last_u.id
      WHERE ${whereClauses}
      GROUP BY lm.thread_id, lm.listing_id, l.name, l.slug, l.logo_url,
               sub.subject, last_msg.content, last_msg.sender_user_id,
               last_u.first_name, last_u.last_name, last_msg.created_at
      ORDER BY last_msg.created_at DESC
      LIMIT ? OFFSET ?
    `;

    // Add userId for unread_count calculation
    const queryParams = [params[0], userId, ...params.slice(1), limit, offset];

    const result: DbResult<BizWireThreadSummary> = await this.db.query(sql, queryParams);

    // Count query
    const countParams = [params[0], ...params.slice(1)];
    const countSql = `
      SELECT COUNT(DISTINCT lm.thread_id) AS total
      FROM listing_messages lm
      JOIN listings l ON lm.listing_id = l.id
      WHERE ${whereClauses}
    `;

    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(countSql, countParams);
    const total = bigIntToNumber(countResult.rows[0]?.total || 0);

    return {
      data: (result.rows || []).map((row) => ({
        ...row,
        message_count: bigIntToNumber(row.message_count),
        unread_count: bigIntToNumber(row.unread_count)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get unread BizWire message count for a user
   */
  async getUserUnreadCount(userId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) AS count
      FROM listing_messages lm
      WHERE lm.is_read = 0
        AND lm.sender_user_id != ?
        AND lm.thread_id IN (
          SELECT DISTINCT thread_id FROM listing_messages WHERE sender_user_id = ?
        )
    `;
    const result: DbResult<{ count: bigint | number }> = await this.db.query(sql, [userId, userId]);
    return bigIntToNumber(result.rows[0]?.count || 0);
  }

  /**
   * Mark all messages in a thread as read for a specific user
   * (Marks messages from OTHER participants as read)
   */
  async markThreadAsRead(threadId: string, userId: number): Promise<void> {
    const sql = `
      UPDATE listing_messages
      SET is_read = 1, read_at = NOW(), status = CASE WHEN status = 'new' THEN 'read' ELSE status END
      WHERE thread_id = ? AND sender_user_id != ? AND is_read = 0
    `;
    await this.db.query(sql, [threadId, userId]);
  }

  /**
   * Archive all messages in a BizWire thread
   */
  async archiveThread(threadId: string): Promise<void> {
    const sql = `UPDATE listing_messages SET status = 'archived' WHERE thread_id = ?`;
    await this.db.query(sql, [threadId]);
  }
}
