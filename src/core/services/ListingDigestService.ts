/**
 * ListingDigestService - Digest content generation for category subscribers
 *
 * Provides content for digest emails by querying new listings in user's subscribed
 * categories since the last digest window. Actual email sending is handled by
 * the existing EmailNotificationService.sendPendingDigests() + cron jobs.
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ aliases
 * - Error handling: ErrorService-based error capture
 * - bigIntToNumber() for all COUNT queries
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/core/services/notification/EmailNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

export interface ListingSummary {
  id: number;
  name: string;
  slug: string;
  category_name: string | null;
  created_at: Date;
}

export interface DigestCategory {
  categoryId: number;
  categoryName: string;
  listings: ListingSummary[];
}

export interface DigestContent {
  userId: number;
  frequency: 'daily' | 'weekly';
  windowStart: Date;
  categories: DigestCategory[];
  totalListings: number;
}

export interface DigestPreviewData {
  userId: number;
  categories: DigestCategory[];
  totalListings: number;
  nextDigestAt: Date | null;
  hasSubscriptions: boolean;
}

// ============================================================================
// ListingDigestService
// ============================================================================

export class ListingDigestService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Get digest content for a user based on their category subscriptions
   */
  async getDigestContent(userId: number, frequency: 'daily' | 'weekly'): Promise<DigestContent> {
    const windowDays = frequency === 'daily' ? 1 : 7;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    try {
      // Get user's subscribed categories
      const subscriptionsResult = await this.db.query<{
        category_id: number;
        category_name: string;
      }>(
        `SELECT cs.category_id, c.name as category_name
         FROM category_subscriptions cs
         JOIN categories c ON c.id = cs.category_id
         WHERE cs.user_id = ? AND cs.notification_frequency = ?`,
        [userId, frequency]
      );

      if (subscriptionsResult.rows.length === 0) {
        return {
          userId,
          frequency,
          windowStart,
          categories: [],
          totalListings: 0
        };
      }

      const categories: DigestCategory[] = [];

      for (const sub of subscriptionsResult.rows) {
        const listings = await this.getNewListingsInCategory(sub.category_id, windowStart, 5);
        if (listings.length > 0) {
          categories.push({
            categoryId: sub.category_id,
            categoryName: sub.category_name,
            listings
          });
        }
      }

      const totalListings = categories.reduce((sum, cat) => sum + cat.listings.length, 0);

      return {
        userId,
        frequency,
        windowStart,
        categories,
        totalListings
      };
    } catch (error) {
      ErrorService.capture('[ListingDigestService] getDigestContent failed:', error);
      return {
        userId,
        frequency,
        windowStart,
        categories: [],
        totalListings: 0
      };
    }
  }

  /**
   * Generate a preview of the next digest for a user
   */
  async generateDigestPreview(userId: number): Promise<DigestPreviewData> {
    try {
      // Check if user has any subscriptions
      const countResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM category_subscriptions WHERE user_id = ?',
        [userId]
      );
      const subscriptionCount = bigIntToNumber(countResult.rows[0]?.total ?? 0);

      if (subscriptionCount === 0) {
        return {
          userId,
          categories: [],
          totalListings: 0,
          nextDigestAt: null,
          hasSubscriptions: false
        };
      }

      // Get subscribed categories (show last 7 days preview regardless of frequency)
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 7);

      const subscriptionsResult = await this.db.query<{
        category_id: number;
        category_name: string;
      }>(
        `SELECT cs.category_id, c.name as category_name
         FROM category_subscriptions cs
         JOIN categories c ON c.id = cs.category_id
         WHERE cs.user_id = ?`,
        [userId]
      );

      const categories: DigestCategory[] = [];

      for (const sub of subscriptionsResult.rows) {
        const listings = await this.getNewListingsInCategory(sub.category_id, windowStart, 3);
        if (listings.length > 0) {
          categories.push({
            categoryId: sub.category_id,
            categoryName: sub.category_name,
            listings
          });
        }
      }

      const totalListings = categories.reduce((sum, cat) => sum + cat.listings.length, 0);

      // Calculate next digest time (tomorrow at 9am)
      const nextDigestAt = new Date();
      nextDigestAt.setDate(nextDigestAt.getDate() + 1);
      nextDigestAt.setHours(9, 0, 0, 0);

      return {
        userId,
        categories,
        totalListings,
        nextDigestAt,
        hasSubscriptions: true
      };
    } catch (error) {
      ErrorService.capture('[ListingDigestService] generateDigestPreview failed:', error);
      return {
        userId,
        categories: [],
        totalListings: 0,
        nextDigestAt: null,
        hasSubscriptions: false
      };
    }
  }

  /**
   * Get recently published listings in a category since a given date
   */
  async getNewListingsInCategory(
    categoryId: number,
    since: Date,
    limit = 10
  ): Promise<ListingSummary[]> {
    try {
      const result = await this.db.query<ListingSummary>(
        `SELECT l.id, l.name, l.slug, c.name as category_name, l.created_at
         FROM listings l
         LEFT JOIN categories c ON c.id = l.category_id
         WHERE l.category_id = ?
           AND l.status = 'active'
           AND l.created_at >= ?
         ORDER BY l.created_at DESC
         LIMIT ?`,
        [categoryId, since, limit]
      );
      return result.rows;
    } catch (error) {
      ErrorService.capture('[ListingDigestService] getNewListingsInCategory failed:', error);
      return [];
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let listingDigestServiceInstance: ListingDigestService | null = null;

export function getListingDigestService(): ListingDigestService {
  if (!listingDigestServiceInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    listingDigestServiceInstance = new ListingDigestService(getDatabaseService());
  }
  return listingDigestServiceInstance;
}

export default ListingDigestService;
