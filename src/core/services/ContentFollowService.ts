/**
 * ContentFollowService
 *
 * Manages content subscription follows for users. Replicates the canonical
 * EventService follow pattern (followBusiness/unfollowBusiness/getFollowStatus)
 * with content-specific extensions:
 *   - Soft-delete (is_active = 0) instead of hard DELETE
 *   - content_type_filter for filtered subscriptions
 *   - Default frequency 'daily' (not 'realtime')
 *
 * @authority TIER_4_CONTENT_SUBSCRIPTION_MASTER_INDEX.md - Phase 1
 * @tier STANDARD
 * @generated dna-v11.4.0
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import {
  ContentFollow,
  ContentFollowRow,
  ContentFollowState,
  ContentFollower,
  ContentFollowType,
  ContentNotificationFrequency,
} from '@core/types/content-follow';

export class ContentFollowService {
  constructor(private db: DatabaseService) {}

  /**
   * Follow content — INSERT ... ON DUPLICATE KEY UPDATE pattern.
   * Re-activates a previously soft-deactivated follow if it exists.
   * Returns the created or updated ContentFollow.
   *
   * @pattern EventService.followBusiness (lines 2579-2598)
   */
  async followContent(
    userId: number,
    followType: ContentFollowType,
    targetId: number | null,
    frequency: ContentNotificationFrequency = 'daily',
    contentTypeFilter?: string | null
  ): Promise<ContentFollow> {
    const filter = contentTypeFilter ?? null;

    await this.db.query(
      `INSERT INTO content_follows (user_id, follow_type, target_id, content_type_filter, notification_frequency, is_active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         notification_frequency = VALUES(notification_frequency),
         is_active = 1`,
      [userId, followType, targetId, filter, frequency]
    );

    const result = await this.db.query<ContentFollowRow>(
      `SELECT * FROM content_follows
       WHERE user_id = ?
         AND follow_type = ?
         AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))
         AND (content_type_filter = ? OR (content_type_filter IS NULL AND ? IS NULL))`,
      [userId, followType, targetId, targetId, filter, filter]
    );

    if (result.rows.length === 0) {
      throw new BizError({
        code: 'NOT_FOUND',
        message: 'Content follow not found after insert',
        context: { userId, followType, targetId },
        userMessage: 'Follow operation failed. Please try again.',
      });
    }

    return this.mapRowToContentFollow(result.rows[0]!);
  }

  /**
   * Soft-delete a follow — sets is_active = 0.
   * User_id in WHERE prevents unauthorized unfollows.
   *
   * @pattern EventService.unfollowBusiness (soft variant)
   */
  async unfollowContent(userId: number, followId: number): Promise<void> {
    await this.db.query(
      `UPDATE content_follows SET is_active = 0 WHERE id = ? AND user_id = ?`,
      [followId, userId]
    );
  }

  /**
   * Hard-delete a follow row — for admin cleanup or GDPR requests only.
   * NOT exposed in public API.
   */
  async hardDeleteFollow(followId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM content_follows WHERE id = ?`,
      [followId]
    );
  }

  /**
   * Check follow status for a specific target.
   * Null-safe WHERE for both target_id AND content_type_filter.
   * Default when not found: { isFollowing: false, followId: null, frequency: 'daily', isActive: false }
   *
   * @pattern EventService.getFollowStatus (lines 2610-2631)
   */
  async getFollowStatus(
    userId: number,
    followType: ContentFollowType,
    targetId: number | null,
    contentTypeFilter?: string | null
  ): Promise<ContentFollowState> {
    const filter = contentTypeFilter ?? null;

    const result = await this.db.query<{
      id: number;
      notification_frequency: string;
      is_active: number;
    }>(
      `SELECT id, notification_frequency, is_active FROM content_follows
       WHERE user_id = ?
         AND follow_type = ?
         AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))
         AND (content_type_filter = ? OR (content_type_filter IS NULL AND ? IS NULL))`,
      [userId, followType, targetId, targetId, filter, filter]
    );

    if (result.rows.length === 0) {
      return { isFollowing: false, followId: null, frequency: 'daily', isActive: false };
    }

    const row = result.rows[0]!;
    return {
      isFollowing: true,
      followId: row.id,
      frequency: row.notification_frequency as ContentNotificationFrequency,
      isActive: row.is_active === 1,
    };
  }

  /**
   * Get all follows for a user.
   * Optionally filter to active-only follows.
   */
  async getUserFollows(userId: number, activeOnly = true): Promise<ContentFollow[]> {
    const sql = activeOnly
      ? `SELECT * FROM content_follows WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`
      : `SELECT * FROM content_follows WHERE user_id = ? ORDER BY created_at DESC`;

    const result = await this.db.query<ContentFollowRow>(sql, [userId]);
    return result.rows.map((row) => this.mapRowToContentFollow(row));
  }

  /**
   * Get total active follower count for a follow_type + target combination.
   * Uses bigIntToNumber() for MariaDB COUNT(*) result.
   */
  async getFollowerCount(followType: ContentFollowType, targetId: number | null): Promise<number> {
    const result = await this.db.query<{ cnt: bigint | number }>(
      `SELECT COUNT(*) as cnt FROM content_follows
       WHERE follow_type = ?
         AND (target_id = ? OR (target_id IS NULL AND ? IS NULL))
         AND is_active = 1`,
      [followType, targetId, targetId]
    );
    return bigIntToNumber(result.rows[0]?.cnt ?? 0);
  }

  /**
   * Get all listing IDs that a user follows via 'business' follow type.
   * Used by content browse pages to filter content to followed creators.
   */
  async getFollowedListingIds(userId: number): Promise<number[]> {
    const result = await this.db.query<{ target_id: number }>(
      `SELECT target_id FROM content_follows
       WHERE user_id = ? AND follow_type = 'business' AND is_active = 1 AND target_id IS NOT NULL`,
      [userId]
    );
    return result.rows.map((row) => row.target_id);
  }

  /**
   * Check if a user has any active 'all_content' follow.
   */
  async hasAllContentFollow(userId: number): Promise<boolean> {
    const result = await this.db.query<{ cnt: bigint | number }>(
      `SELECT COUNT(*) as cnt FROM content_follows
       WHERE user_id = ? AND follow_type = 'all_content' AND is_active = 1`,
      [userId]
    );
    return bigIntToNumber(result.rows[0]?.cnt ?? 0) > 0;
  }

  /**
   * Update notification frequency for an existing follow.
   * User_id in WHERE prevents unauthorized frequency changes.
   */
  async updateFrequency(
    followId: number,
    userId: number,
    frequency: ContentNotificationFrequency
  ): Promise<void> {
    await this.db.query(
      `UPDATE content_follows SET notification_frequency = ? WHERE id = ? AND user_id = ?`,
      [frequency, followId, userId]
    );
  }

  /**
   * Get all active followers who should be notified when content publishes.
   * Covers four match conditions:
   *   1. Following the business (listing) directly
   *   2. Following a specific content_type via content_type_filter
   *   3. Following all_content (global subscription)
   *   4. Following the content category directly (e.g., 'newsletter', 'podcast_show')
   *
   * Phase 6 will call this to build notification dispatch lists.
   */
  async getFollowersForContent(
    contentType: string,
    contentId: number,
    listingId: number
  ): Promise<ContentFollower[]> {
    // Suppress unused-variable warning — contentId is reserved for Phase 6 per-item follows
    void contentId;

    const result = await this.db.query<{
      user_id: number;
      id: number;
      follow_type: ContentFollowType;
      notification_frequency: ContentNotificationFrequency;
      content_type_filter: string | null;
    }>(
      `SELECT user_id, id, follow_type, notification_frequency, content_type_filter
       FROM content_follows
       WHERE is_active = 1
         AND (
           (follow_type = 'business' AND target_id = ?)
           OR (follow_type = 'content_type' AND content_type_filter = ?)
           OR (follow_type = 'all_content')
           OR (follow_type = ? AND target_id IS NULL)
         )`,
      [listingId, contentType, contentType]
    );

    return result.rows.map((row) => ({
      userId: row.user_id,
      followId: row.id,
      followType: row.follow_type,
      notificationFrequency: row.notification_frequency,
      contentTypeFilter: row.content_type_filter,
    }));
  }

  /**
   * Map a snake_case DB row to camelCase ContentFollow.
   * Converts is_active TINYINT(1) to boolean.
   */
  private mapRowToContentFollow(row: ContentFollowRow): ContentFollow {
    return {
      id: row.id,
      userId: row.user_id,
      followType: row.follow_type,
      targetId: row.target_id,
      contentTypeFilter: row.content_type_filter,
      notificationFrequency: row.notification_frequency,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
