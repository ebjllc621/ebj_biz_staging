/**
 * DashboardService - Dashboard Data Fetching Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/homepage/services/HomePageService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  DashboardStats,
  NotificationSummary,
  Notification,
  Bookmark,
  DashboardActivityItem
} from '../types';

// ============================================================================
// DashboardService Implementation
// ============================================================================

export class DashboardService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // Dashboard Statistics
  // ==========================================================================

  /**
   * Get dashboard statistics for user
   * @param userId User ID
   * @returns Dashboard statistics
   */
  async getDashboardStats(userId: number): Promise<DashboardStats> {
    const result: DbResult<{
      connections: bigint | number;
      profile_views: bigint | number;
      unread_messages: bigint | number;
      pending_requests: bigint | number;
      bookmarks_count: bigint | number;
      reviews_count: bigint | number;
      recommendations_sent: bigint | number;
      referrals_sent: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM user_connection WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected') as connections,
        (SELECT COUNT(*) FROM profile_view WHERE profile_owner_id = ? AND viewed_at > DATE_SUB(NOW(), INTERVAL 30 DAY)) as profile_views,
        (SELECT COUNT(*) FROM user_message WHERE receiver_user_id = ? AND read_at IS NULL) as unread_messages,
        (SELECT COUNT(*) FROM connection_request WHERE receiver_user_id = ? AND status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM user_bookmarks WHERE user_id = ?) as bookmarks_count,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as reviews_count,
        (SELECT COUNT(*) FROM user_referrals WHERE referrer_user_id = ? AND entity_type != 'platform_invite') as recommendations_sent,
        (SELECT COUNT(*) FROM user_referrals WHERE referrer_user_id = ? AND entity_type = 'platform_invite') as referrals_sent`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );

    const stats = result.rows[0];
    return {
      connections: Number(stats?.connections ?? 0),
      profile_views: Number(stats?.profile_views ?? 0),
      unread_messages: Number(stats?.unread_messages ?? 0),
      pending_requests: Number(stats?.pending_requests ?? 0),
      bookmarks_count: Number(stats?.bookmarks_count ?? 0),
      reviews_count: Number(stats?.reviews_count ?? 0),
      recommendations_sent: Number(stats?.recommendations_sent ?? 0),
      referrals_sent: Number(stats?.referrals_sent ?? 0)
    };
  }

  // ==========================================================================
  // Notifications
  // ==========================================================================

  /**
   * Get notification summary for badges
   * @param userId User ID
   * @returns Notification counts by type (includes unread recommendations)
   */
  async getNotificationSummary(userId: number): Promise<NotificationSummary> {
    const result: DbResult<{
      total_unread: bigint | number;
      connection_request: bigint | number;
      message: bigint | number;
      bizwire: bigint | number;
      review: bigint | number;
      mention: bigint | number;
      system: bigint | number;
      recommendation: bigint | number;
    }> = await this.db.query(
      `SELECT
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0) as total_unread,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'connection_request') as connection_request,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'message') as message,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'bizwire') as bizwire,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'review') as review,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'mention') as mention,
        (SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND is_read = 0 AND notification_type = 'system') as system,
        (SELECT COUNT(*) FROM user_referrals WHERE recipient_user_id = ? AND entity_type != 'platform_invite' AND viewed_at IS NULL) as recommendation`,
      [userId, userId, userId, userId, userId, userId, userId, userId]
    );

    const stats = result.rows[0];
    return {
      total_unread: Number(stats?.total_unread ?? 0),
      by_type: {
        connection_request: Number(stats?.connection_request ?? 0),
        message: Number(stats?.message ?? 0),
        bizwire: Number(stats?.bizwire ?? 0),
        review: Number(stats?.review ?? 0),
        mention: Number(stats?.mention ?? 0),
        system: Number(stats?.system ?? 0),
        recommendation: Number(stats?.recommendation ?? 0)
      }
    };
  }

  /**
   * Get user notifications
   * @param userId User ID
   * @param limit Maximum number of notifications to return
   * @returns Array of notifications
   */
  async getNotifications(userId: number, limit: number = 20): Promise<Notification[]> {
    const result: DbResult<{
      id: number;
      notification_type: string;
      title: string;
      message: string | null;
      entity_type: string | null;
      entity_id: number | null;
      action_url: string | null;
      is_read: number;
      created_at: Date;
    }> = await this.db.query(
      `SELECT
        id,
        notification_type,
        title,
        message,
        entity_type,
        entity_id,
        action_url,
        is_read,
        created_at
      FROM user_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      notification_type: row.notification_type,
      title: row.title,
      message: row.message ?? undefined,
      entity_type: row.entity_type ?? undefined,
      entity_id: row.entity_id ?? undefined,
      action_url: row.action_url ?? undefined,
      is_read: Boolean(row.is_read),
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Mark notification as read
   * @param userId User ID
   * @param notificationId Notification ID
   */
  async markNotificationRead(userId: number, notificationId: number): Promise<void> {
    await this.db.query(
      `UPDATE user_notifications
       SET is_read = 1, read_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
  }

  /**
   * Mark all notifications of a specific type as read
   * Used when user visits a page that shows notifications of that type
   * @param userId User ID
   * @param notificationType Notification type to mark as read
   * @returns Number of notifications marked as read
   */
  async markNotificationsByTypeRead(userId: number, notificationType: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE user_notifications
       SET is_read = 1, read_at = NOW()
       WHERE user_id = ? AND notification_type = ? AND is_read = 0`,
      [userId, notificationType]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Mark all unread notifications as read
   * Used for "Mark all as read" functionality
   * @param userId User ID
   * @returns Number of notifications marked as read
   */
  async markAllNotificationsRead(userId: number): Promise<number> {
    const result = await this.db.query(
      `UPDATE user_notifications
       SET is_read = 1, read_at = NOW()
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Get paginated notifications with optional type filter
   * @param userId User ID
   * @param options Pagination and filter options
   * @returns Paginated notifications result
   */
  async getNotificationsPaginated(
    userId: number,
    options: {
      page?: number;
      pageSize?: number;
      notificationType?: string | null;
    } = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, notificationType = null } = options;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult: DbResult<{ total: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as total
       FROM user_notifications
       WHERE user_id = ?
         AND (? IS NULL OR notification_type = ?)`,
      [userId, notificationType, notificationType]
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    // Get paginated results
    const result: DbResult<{
      id: number;
      notification_type: string;
      title: string;
      message: string | null;
      entity_type: string | null;
      entity_id: number | null;
      action_url: string | null;
      is_read: number;
      created_at: Date;
    }> = await this.db.query(
      `SELECT
        id, notification_type, title, message, entity_type, entity_id,
        action_url, is_read, created_at
      FROM user_notifications
      WHERE user_id = ?
        AND (? IS NULL OR notification_type = ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, notificationType, notificationType, pageSize, offset]
    );

    const notifications = result.rows.map(row => ({
      id: row.id,
      notification_type: row.notification_type,
      title: row.title,
      message: row.message ?? undefined,
      entity_type: row.entity_type ?? undefined,
      entity_id: row.entity_id ?? undefined,
      action_url: row.action_url ?? undefined,
      is_read: Boolean(row.is_read),
      created_at: new Date(row.created_at)
    }));

    return {
      notifications,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Delete a notification
   * @param userId User ID (for ownership validation)
   * @param notificationId Notification ID to delete
   * @returns Whether deletion was successful
   */
  async deleteNotification(userId: number, notificationId: number): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM user_notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // Bookmarks
  // ==========================================================================

  /**
   * Get user bookmarks
   * @param userId User ID
   * @param entityType Optional filter by entity type
   * @returns Array of bookmarks with entity details
   */
  async getBookmarks(userId: number, entityType?: string): Promise<Bookmark[]> {
    const baseQuery = `
      SELECT
        b.id,
        b.entity_type,
        b.entity_id,
        b.notes,
        b.created_at,
        CASE
          WHEN b.entity_type = 'listing' THEN l.name
          WHEN b.entity_type = 'event' THEN e.title
          WHEN b.entity_type = 'offer' THEN o.title
          ELSE 'Unknown'
        END as entity_name,
        CASE
          WHEN b.entity_type = 'listing' THEN l.cover_image_url
          WHEN b.entity_type = 'event' THEN e.banner_image
          WHEN b.entity_type = 'offer' THEN o.image
          ELSE NULL
        END as entity_image
      FROM user_bookmarks b
      LEFT JOIN listings l ON b.entity_type = 'listing' AND b.entity_id = l.id
      LEFT JOIN events e ON b.entity_type = 'event' AND b.entity_id = e.id
      LEFT JOIN offers o ON b.entity_type = 'offer' AND b.entity_id = o.id
      WHERE b.user_id = ?
    `;

    let query = baseQuery;
    const params: (string | number)[] = [userId];

    if (entityType) {
      query += ' AND b.entity_type = ?';
      params.push(entityType);
    }

    query += ' ORDER BY b.created_at DESC';

    const result: DbResult<{
      id: number;
      entity_type: 'listing' | 'event' | 'offer' | 'content';
      entity_id: number;
      entity_name: string;
      entity_image: string | null;
      notes: string | null;
      created_at: Date;
    }> = await this.db.query(query, params);

    return result.rows.map(row => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      entity_image: row.entity_image ?? undefined,
      notes: row.notes ?? undefined,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Add bookmark
   * @param userId User ID
   * @param entityType Entity type
   * @param entityId Entity ID
   * @returns Created bookmark
   */
  async addBookmark(userId: number, entityType: string, entityId: number): Promise<Bookmark> {
    const insertResult = await this.db.query(
      `INSERT INTO user_bookmarks (user_id, entity_type, entity_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [userId, entityType, entityId]
    );

    const bookmarkId = insertResult.insertId;

    // Fetch the created bookmark with entity details
    const bookmarks = await this.getBookmarks(userId, entityType);
    const bookmark = bookmarks.find(b => b.id === bookmarkId);

    if (!bookmark) {
      throw BizError.internalServerError('DashboardService', new Error('Failed to retrieve created bookmark'));
    }

    return bookmark;
  }

  /**
   * Remove bookmark
   * @param userId User ID
   * @param bookmarkId Bookmark ID
   */
  async removeBookmark(userId: number, bookmarkId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM user_bookmarks WHERE id = ? AND user_id = ?`,
      [bookmarkId, userId]
    );
  }

  // ==========================================================================
  // Activity
  // ==========================================================================

  /**
   * Get recent activity for user
   * Includes:
   * - User's own activity
   * - Activity where user is the target
   * - Activity from connections (respecting visibility)
   *
   * @param userId User ID
   * @param limit Maximum number of activity items to return
   * @param offset Offset for pagination (default: 0)
   * @returns Array of activity items
   */
  async getRecentActivity(userId: number, limit: number = 10, offset: number = 0): Promise<DashboardActivityItem[]> {
    const result: DbResult<{
      id: number;
      activity_type: string;
      title: string;
      description: string;
      actor_name: string | null;
      created_at: Date;
    }> = await this.db.query(
      `SELECT
        sa.id,
        sa.activity_type,
        COALESCE(sa.title, 'Activity') as title,
        COALESCE(sa.description, '') as description,
        COALESCE(u.display_name, CONCAT(u.first_name, ' ', u.last_name), u.username) as actor_name,
        sa.created_at
      FROM social_activity sa
      LEFT JOIN users u ON sa.creator_user_id = u.id
      WHERE
        -- User's own activity
        sa.creator_user_id = ?
        -- Activity targeting the user (e.g., someone connected with them)
        OR sa.target_user_id = ?
        -- Activity from connections (only 'connections' or 'public' visibility)
        OR (
          sa.creator_user_id IN (
            SELECT receiver_user_id FROM user_connection WHERE sender_user_id = ? AND status = 'connected'
            UNION
            SELECT sender_user_id FROM user_connection WHERE receiver_user_id = ? AND status = 'connected'
          )
          AND sa.visibility IN ('connections', 'public')
        )
        -- Public activity from anyone
        OR sa.visibility = 'public'
      ORDER BY sa.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      type: (row.activity_type as DashboardActivityItem['type']) || 'listing',
      title: row.title,
      description: row.description,
      actor_name: row.actor_name ?? undefined,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Get total activity count for pagination
   * @param userId User ID
   * @returns Total count of activity items
   */
  async getActivityCount(userId: number): Promise<number> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count
      FROM social_activity sa
      WHERE
        sa.creator_user_id = ?
        OR sa.target_user_id = ?
        OR (
          sa.creator_user_id IN (
            SELECT receiver_user_id FROM user_connection WHERE sender_user_id = ? AND status = 'connected'
            UNION
            SELECT sender_user_id FROM user_connection WHERE receiver_user_id = ? AND status = 'connected'
          )
          AND sa.visibility IN ('connections', 'public')
        )
        OR sa.visibility = 'public'`,
      [userId, userId, userId, userId]
    );

    return bigIntToNumber(result.rows[0]?.count);
  }

  // ==========================================================================
  // Quick Stats (Reuse HomePageService pattern)
  // ==========================================================================

  /**
   * Get connections count for user
   * @param userId User ID
   * @returns Number of connections
   */
  async getConnectionsCount(userId: number): Promise<number> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count
       FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?)
       AND status = 'connected'`,
      [userId, userId]
    );

    return bigIntToNumber(result.rows[0]?.count);
  }

  /**
   * Get unread messages count for user
   * @param userId User ID
   * @returns Number of unread messages
   */
  async getUnreadMessagesCount(userId: number): Promise<number> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count
       FROM user_message
       WHERE receiver_user_id = ? AND read_at IS NULL`,
      [userId]
    );

    return bigIntToNumber(result.rows[0]?.count);
  }

  /**
   * Get pending connection requests count for user
   * @param userId User ID
   * @returns Number of pending requests
   */
  async getPendingRequestsCount(userId: number): Promise<number> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const result: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) as count
       FROM connection_request
       WHERE receiver_user_id = ? AND status = 'pending'`,
      [userId]
    );

    return bigIntToNumber(result.rows[0]?.count);
  }
}
