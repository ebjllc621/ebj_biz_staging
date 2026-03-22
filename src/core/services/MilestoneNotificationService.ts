/**
 * MilestoneNotificationService - Detects and records listing milestones
 *
 * Queries analytics totals, compares against thresholds, records new milestones
 * in listing_milestones, and dispatches notifications to listing owners.
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
 * @reference src/core/services/notification/OfferNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';
import { bigIntToNumber } from '@core/utils/bigint';
import { NotificationService } from '@core/services/NotificationService';

// ============================================================================
// Constants
// ============================================================================

const MILESTONE_THRESHOLDS: Record<string, number[]> = {
  views: [10, 25, 50, 100, 250, 500, 1000],
  reviews: [1, 5, 10, 25, 50],
  shares: [5, 10, 25, 50, 100],
  leads: [5, 10, 25, 50, 100],
  followers: [5, 10, 25, 50, 100]
};

const MILESTONE_MESSAGES: Record<string, Record<number, string>> = {
  views: {
    10: 'Your listing reached 10 views!',
    25: 'Your listing reached 25 views!',
    50: 'Your listing reached 50 views!',
    100: 'Your listing reached 100 views!',
    250: 'Your listing reached 250 views!',
    500: 'Your listing reached 500 views!',
    1000: 'Your listing reached 1,000 views!'
  },
  reviews: {
    1: 'You received your first review!',
    5: 'You received your 5th review!',
    10: '10 reviews — your reputation is growing!',
    25: 'Amazing — 25 reviews and counting!',
    50: '50 reviews! Your business is thriving!'
  },
  shares: {
    5: 'Your listing has been shared 5 times!',
    10: '10 shares — your listing is spreading!',
    25: '25 shares! Great reach!',
    50: '50 shares! Your listing is going viral!',
    100: '100 shares! Incredible reach!'
  },
  leads: {
    5: 'Your listing generated 5 leads!',
    10: '10 leads — your listing is converting!',
    25: '25 leads! Great engagement!',
    50: '50 leads! Your business is booming!',
    100: '100 leads! Outstanding performance!'
  },
  followers: {
    5: 'You have 5 followers!',
    10: '10 followers and growing!',
    25: '25 followers — your community is building!',
    50: '50 followers! Strong community!',
    100: '100 followers! You have a real audience!'
  }
};

// ============================================================================
// Types
// ============================================================================

export interface Milestone {
  id: number;
  listing_id: number;
  milestone_type: string;
  threshold: number;
  achieved_at: Date;
  notified: number;
}

export interface MilestoneResult {
  milestone_type: string;
  threshold: number;
  milestoneId: number;
}

// ============================================================================
// MilestoneNotificationService
// ============================================================================

export class MilestoneNotificationService {
  private db: DatabaseService;
  private notificationService: NotificationService;

  constructor(db: DatabaseService, notificationService: NotificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  /**
   * Check analytics totals against thresholds and record new milestones
   */
  async checkAndRecordMilestones(listingId: number): Promise<MilestoneResult[]> {
    const newMilestones: MilestoneResult[] = [];

    try {
      // Get listing owner for notification dispatch
      const listingResult = await this.db.query<{
        user_id: number | null;
        name: string;
      }>(
        'SELECT user_id, name FROM listings WHERE id = ?',
        [listingId]
      );

      if (listingResult.rows.length === 0) return [];
      const listing = listingResult.rows[0];
      if (!listing?.user_id) return [];

      // Query totals for each milestone type
      const viewsResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM analytics_listing_views WHERE listing_id = ?',
        [listingId]
      );
      const reviewsResult = await this.db.query<{ total: number | bigint }>(
        "SELECT COUNT(*) as total FROM reviews WHERE listing_id = ? AND status = 'approved'",
        [listingId]
      );
      const sharesResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM listing_shares WHERE listing_id = ?',
        [listingId]
      );
      const leadsResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM listing_leads WHERE listing_id = ?',
        [listingId]
      );
      const followersResult = await this.db.query<{ total: number | bigint }>(
        'SELECT COUNT(*) as total FROM user_bookmarks WHERE listing_id = ?',
        [listingId]
      );

      const totals: Record<string, number> = {
        views: bigIntToNumber(viewsResult.rows[0]?.total ?? 0),
        reviews: bigIntToNumber(reviewsResult.rows[0]?.total ?? 0),
        shares: bigIntToNumber(sharesResult.rows[0]?.total ?? 0),
        leads: bigIntToNumber(leadsResult.rows[0]?.total ?? 0),
        followers: bigIntToNumber(followersResult.rows[0]?.total ?? 0)
      };

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';

      // Check each milestone type
      for (const [milestoneType, thresholds] of Object.entries(MILESTONE_THRESHOLDS)) {
        const currentTotal = totals[milestoneType] ?? 0;

        for (const threshold of thresholds) {
          if (currentTotal >= threshold) {
            // Attempt insert — UNIQUE KEY prevents duplicate milestones
            try {
              const insertResult = await this.db.query(
                `INSERT IGNORE INTO listing_milestones (listing_id, milestone_type, threshold, notified)
                 VALUES (?, ?, ?, 0)`,
                [listingId, milestoneType, threshold]
              );

              const affectedRows = (insertResult as { affectedRows?: number }).affectedRows ?? 0;
              if (affectedRows > 0) {
                const newMilestoneResult = await this.db.query<{ id: number }>(
                  'SELECT id FROM listing_milestones WHERE listing_id = ? AND milestone_type = ? AND threshold = ?',
                  [listingId, milestoneType, threshold]
                );
                const milestoneId = newMilestoneResult.rows[0]?.id ?? 0;

                newMilestones.push({ milestone_type: milestoneType, threshold, milestoneId });

                // Dispatch notification to listing owner
                const message = MILESTONE_MESSAGES[milestoneType]?.[threshold]
                  ?? `Your listing reached ${threshold} ${milestoneType}!`;

                await this.notificationService.dispatch({
                  type: 'listing.milestone_achieved',
                  recipientId: listing.user_id,
                  title: `Milestone: ${listing.name}`,
                  message,
                  entityType: 'listing',
                  entityId: listingId,
                  actionUrl: `${baseUrl}/dashboard/listings`,
                  priority: 'normal',
                  metadata: {
                    milestone_type: milestoneType,
                    threshold,
                    current_total: currentTotal
                  }
                });
              }
            } catch (insertError) {
              ErrorService.capture('[MilestoneNotificationService] milestone insert failed:', insertError);
            }
          }
        }
      }

      return newMilestones;
    } catch (error) {
      ErrorService.capture('[MilestoneNotificationService] checkAndRecordMilestones failed:', error);
      return [];
    }
  }

  /**
   * Get unnotified milestones for dashboard display
   */
  async getUnnotifiedMilestones(listingId: number): Promise<Milestone[]> {
    try {
      const result = await this.db.query<Milestone>(
        'SELECT * FROM listing_milestones WHERE listing_id = ? AND notified = 0 ORDER BY achieved_at DESC',
        [listingId]
      );
      return result.rows;
    } catch (error) {
      ErrorService.capture('[MilestoneNotificationService] getUnnotifiedMilestones failed:', error);
      return [];
    }
  }

  /**
   * Mark a milestone as notified (celebration toast shown)
   */
  async markMilestoneNotified(milestoneId: number): Promise<void> {
    try {
      await this.db.query(
        'UPDATE listing_milestones SET notified = 1 WHERE id = ?',
        [milestoneId]
      );
    } catch (error) {
      ErrorService.capture('[MilestoneNotificationService] markMilestoneNotified failed:', error);
    }
  }

  /**
   * Get full milestone history for a listing
   */
  async getMilestoneHistory(listingId: number): Promise<Milestone[]> {
    try {
      const result = await this.db.query<Milestone>(
        'SELECT * FROM listing_milestones WHERE listing_id = ? ORDER BY achieved_at DESC',
        [listingId]
      );
      return result.rows;
    } catch (error) {
      ErrorService.capture('[MilestoneNotificationService] getMilestoneHistory failed:', error);
      return [];
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let milestoneNotificationServiceInstance: MilestoneNotificationService | null = null;

export function getMilestoneNotificationService(): MilestoneNotificationService {
  if (!milestoneNotificationServiceInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNotificationService } = require('@core/services/ServiceRegistry');
    milestoneNotificationServiceInstance = new MilestoneNotificationService(
      getDatabaseService(),
      getNotificationService()
    );
  }
  return milestoneNotificationServiceInstance;
}

export default MilestoneNotificationService;
