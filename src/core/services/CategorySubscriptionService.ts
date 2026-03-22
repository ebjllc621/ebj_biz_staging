/**
 * CategorySubscriptionService - Category Subscription Management
 *
 * Manages user subscriptions to listing categories, enabling notification
 * dispatch when new listings are published in subscribed categories.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService-based error capture
 * - Build Map v2.1 ENHANCED patterns
 * - bigIntToNumber() for all COUNT queries
 *
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @reference src/core/services/notification/OfferNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

export interface CategorySubscription {
  id: number;
  user_id: number;
  category_id: number;
  notification_frequency: 'realtime' | 'daily' | 'weekly';
  created_at: string;
  category_name?: string;
}

export interface CategorySubscriber {
  user_id: number;
  email: string;
  notification_frequency: 'realtime' | 'daily' | 'weekly';
}

// ============================================================================
// CategorySubscriptionService
// ============================================================================

export class CategorySubscriptionService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  /**
   * Subscribe a user to a category (UPSERT on unique key)
   * @param userId User ID
   * @param categoryId Category ID
   * @param frequency Notification frequency (default: 'daily')
   */
  async subscribe(
    userId: number,
    categoryId: number,
    frequency: 'realtime' | 'daily' | 'weekly' = 'daily'
  ): Promise<{ id: number }> {
    try {
      const result = await this.db.query<{ insertId: number }>(
        `INSERT INTO category_subscriptions (user_id, category_id, notification_frequency)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE notification_frequency = VALUES(notification_frequency)`,
        [userId, categoryId, frequency]
      );

      // For UPSERT, if row existed, get its id
      if (result.insertId) {
        return { id: bigIntToNumber(result.insertId) };
      }

      // Row existed — fetch its id
      const existing = await this.getSubscription(userId, categoryId);
      return { id: existing?.id ?? 0 };

    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] subscribe failed:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from a category
   * @param userId User ID
   * @param categoryId Category ID
   */
  async unsubscribe(userId: number, categoryId: number): Promise<void> {
    try {
      await this.db.query(
        'DELETE FROM category_subscriptions WHERE user_id = ? AND category_id = ?',
        [userId, categoryId]
      );
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] unsubscribe failed:', error);
      throw error;
    }
  }

  /**
   * Get a single subscription for a user/category pair
   * @param userId User ID
   * @param categoryId Category ID
   */
  async getSubscription(userId: number, categoryId: number): Promise<CategorySubscription | null> {
    try {
      const result = await this.db.query<CategorySubscription>(
        `SELECT cs.id, cs.user_id, cs.category_id, cs.notification_frequency, cs.created_at,
                c.name AS category_name
         FROM category_subscriptions cs
         LEFT JOIN categories c ON c.id = cs.category_id
         WHERE cs.user_id = ? AND cs.category_id = ?
         LIMIT 1`,
        [userId, categoryId]
      );

      return result.rows[0] ?? null;
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] getSubscription failed:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions for a user, joined with category names
   * @param userId User ID
   */
  async getUserSubscriptions(userId: number): Promise<CategorySubscription[]> {
    try {
      const result = await this.db.query<CategorySubscription>(
        `SELECT cs.id, cs.user_id, cs.category_id, cs.notification_frequency, cs.created_at,
                c.name AS category_name
         FROM category_subscriptions cs
         LEFT JOIN categories c ON c.id = cs.category_id
         WHERE cs.user_id = ?
         ORDER BY cs.created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] getUserSubscriptions failed:', error);
      throw error;
    }
  }

  /**
   * Update notification frequency for an existing subscription
   * @param userId User ID
   * @param categoryId Category ID
   * @param frequency New frequency
   */
  async updateFrequency(
    userId: number,
    categoryId: number,
    frequency: 'realtime' | 'daily' | 'weekly'
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE category_subscriptions
         SET notification_frequency = ?
         WHERE user_id = ? AND category_id = ?`,
        [frequency, userId, categoryId]
      );
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] updateFrequency failed:', error);
      throw error;
    }
  }

  /**
   * Get all subscribers for a category, optionally filtered by frequency
   * @param categoryId Category ID
   * @param frequency Optional frequency filter
   */
  async getSubscribersForCategory(
    categoryId: number,
    frequency?: 'realtime' | 'daily' | 'weekly'
  ): Promise<CategorySubscriber[]> {
    try {
      let sql = `SELECT cs.user_id, u.email, cs.notification_frequency
                 FROM category_subscriptions cs
                 JOIN users u ON u.id = cs.user_id
                 WHERE cs.category_id = ?`;
      const params: (number | string)[] = [categoryId];

      if (frequency) {
        sql += ' AND cs.notification_frequency = ?';
        params.push(frequency);
      }

      const result = await this.db.query<CategorySubscriber>(sql, params);
      return result.rows;
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] getSubscribersForCategory failed:', error);
      throw error;
    }
  }

  /**
   * Count total subscribers for a category
   * @param categoryId Category ID
   */
  async getSubscriptionCount(categoryId: number): Promise<number> {
    try {
      const result = await this.db.query<{ count: bigint | number }>(
        'SELECT COUNT(*) AS count FROM category_subscriptions WHERE category_id = ?',
        [categoryId]
      );

      const row = result.rows[0];
      return row ? bigIntToNumber(row.count) : 0;
    } catch (error) {
      ErrorService.capture('[CategorySubscriptionService] getSubscriptionCount failed:', error);
      throw error;
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: CategorySubscriptionService | null = null;

export function getCategorySubscriptionService(): CategorySubscriptionService {
  if (!instance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    instance = new CategorySubscriptionService(getDatabaseService());
  }
  return instance;
}

export default CategorySubscriptionService;
