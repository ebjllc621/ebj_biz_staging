/**
 * ShareReminderService - Stateless share reminder for listing owners
 *
 * Determines whether a listing owner should see a share reminder based on:
 * - Listing published > 24h ago
 * - Zero shares recorded
 * - Has page views (people are seeing it)
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
 * @reference src/core/services/FollowerBroadcastService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Types
// ============================================================================

export interface ShareReminderInfo {
  listingId: number;
  listingName: string;
  pageViews: number;
  publishedAt: Date;
  message: string;
}

export interface PerformanceNudge {
  listingId: number;
  views: number;
  shares: number;
  message: string;
}

// ============================================================================
// ShareReminderService
// ============================================================================

export class ShareReminderService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Check if a share reminder should be shown for a listing
   * Criteria: published > 24h ago, 0 shares, has page views
   */
  async shouldShowReminder(listingId: number, ownerId: number): Promise<ShareReminderInfo | null> {
    try {
      // Get listing details — verify ownership
      const listingResult = await this.db.query<{
        id: number;
        name: string;
        created_at: Date;
        user_id: number | null;
        status: string;
      }>(
        'SELECT id, name, created_at, user_id, status FROM listings WHERE id = ? AND user_id = ?',
        [listingId, ownerId]
      );

      if (listingResult.rows.length === 0) return null;
      const listing = listingResult.rows[0];
      if (!listing || listing.status !== 'active') return null;

      // Check if published > 24h ago
      const publishedAt = new Date(listing.created_at);
      const hoursSincePublished = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSincePublished < 24) return null;

      // Check shares count
      const sharesResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM listing_shares WHERE listing_id = ?',
        [listingId]
      );
      const shareCount = bigIntToNumber(sharesResult.rows[0]?.total ?? 0);
      if (shareCount > 0) return null;

      // Check page views
      const viewsResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM analytics_listing_views WHERE listing_id = ?',
        [listingId]
      );
      const viewCount = bigIntToNumber(viewsResult.rows[0]?.total ?? 0);
      if (viewCount === 0) return null;

      return {
        listingId,
        listingName: listing.name,
        pageViews: viewCount,
        publishedAt,
        message: `Your listing has ${viewCount} view${viewCount === 1 ? '' : 's'} — share on social media to reach even more customers!`
      };
    } catch (error) {
      ErrorService.capture('[ShareReminderService] shouldShowReminder failed:', error);
      return null;
    }
  }

  /**
   * Return a performance nudge if listing has views but low shares relative to views
   */
  async getPerformanceNudge(listingId: number): Promise<PerformanceNudge | null> {
    try {
      const viewsResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM analytics_listing_views WHERE listing_id = ?',
        [listingId]
      );
      const sharesResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM listing_shares WHERE listing_id = ?',
        [listingId]
      );

      const views = bigIntToNumber(viewsResult.rows[0]?.total ?? 0);
      const shares = bigIntToNumber(sharesResult.rows[0]?.total ?? 0);

      if (views < 10) return null;

      // Show nudge if share rate is < 5%
      const shareRate = views > 0 ? shares / views : 0;
      if (shareRate >= 0.05) return null;

      return {
        listingId,
        views,
        shares,
        message: `Your listing has ${views} views but only ${shares} shares. Sharing on social media could significantly increase your reach!`
      };
    } catch (error) {
      ErrorService.capture('[ShareReminderService] getPerformanceNudge failed:', error);
      return null;
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let shareReminderServiceInstance: ShareReminderService | null = null;

export function getShareReminderService(): ShareReminderService {
  if (!shareReminderServiceInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    shareReminderServiceInstance = new ShareReminderService(getDatabaseService());
  }
  return shareReminderServiceInstance;
}

export default ShareReminderService;
