/**
 * PostVisitReviewTrigger - Schedules review prompts after user interactions
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/core/services/notification/OfferNotificationService.ts
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Types
// ============================================================================

export interface ScheduledPrompt {
  id: number;
  user_id: number;
  entity_id: number;
  notification_type: string;
  scheduled_at: Date;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// PostVisitReviewTrigger
// ============================================================================

export class PostVisitReviewTrigger {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Schedule a review prompt 24h after directions/contact interaction
   */
  async scheduleReviewPrompt(userId: number, listingId: number, interactionType: string): Promise<void> {
    try {
      // Check if user already reviewed this listing
      const existingReview = await this.db.query<{ id: number }>(
        'SELECT id FROM reviews WHERE user_id = ? AND listing_id = ? LIMIT 1',
        [userId, listingId]
      );
      if (existingReview.rows.length > 0) return;

      // Check if a pending prompt already exists
      const existingPrompt = await this.db.query<{ id: number }>(
        `SELECT id FROM notification_schedule
         WHERE user_id = ? AND entity_type = 'listing' AND entity_id = ?
         AND notification_type = 'review_prompt' AND sent_at IS NULL AND cancelled_at IS NULL LIMIT 1`,
        [userId, listingId]
      );
      if (existingPrompt.rows.length > 0) return;

      // Schedule prompt 24h from now
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 24);

      await this.db.query(
        `INSERT INTO notification_schedule (user_id, entity_type, entity_id, notification_type, scheduled_at, metadata)
         VALUES (?, 'listing', ?, 'review_prompt', ?, ?)`,
        [userId, listingId, scheduledAt, JSON.stringify({ interaction_type: interactionType })]
      );
    } catch (error) {
      ErrorService.capture('[PostVisitReviewTrigger] scheduleReviewPrompt failed:', error);
    }
  }

  /**
   * Get pending review prompts ready to deliver for a user
   */
  async getPendingPrompts(userId: number): Promise<ScheduledPrompt[]> {
    try {
      const result = await this.db.query<ScheduledPrompt>(
        `SELECT id, user_id, entity_id, notification_type, scheduled_at, metadata
         FROM notification_schedule
         WHERE user_id = ? AND notification_type = 'review_prompt'
         AND scheduled_at <= NOW() AND sent_at IS NULL AND cancelled_at IS NULL
         ORDER BY scheduled_at ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      ErrorService.capture('[PostVisitReviewTrigger] getPendingPrompts failed:', error);
      return [];
    }
  }

  /**
   * Mark a prompt as sent
   */
  async markPromptSent(scheduleId: number): Promise<void> {
    try {
      await this.db.query(
        'UPDATE notification_schedule SET sent_at = NOW() WHERE id = ?',
        [scheduleId]
      );
    } catch (error) {
      ErrorService.capture('[PostVisitReviewTrigger] markPromptSent failed:', error);
    }
  }

  /**
   * Cancel prompt if user reviews through other means
   */
  async cancelPrompt(userId: number, listingId: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE notification_schedule SET cancelled_at = NOW()
         WHERE user_id = ? AND entity_type = 'listing' AND entity_id = ?
         AND notification_type = 'review_prompt' AND sent_at IS NULL AND cancelled_at IS NULL`,
        [userId, listingId]
      );
    } catch (error) {
      ErrorService.capture('[PostVisitReviewTrigger] cancelPrompt failed:', error);
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let postVisitReviewTriggerInstance: PostVisitReviewTrigger | null = null;

export function getPostVisitReviewTrigger(): PostVisitReviewTrigger {
  if (!postVisitReviewTriggerInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabaseService } = require('@core/services/DatabaseService');
    postVisitReviewTriggerInstance = new PostVisitReviewTrigger(getDatabaseService());
  }
  return postVisitReviewTriggerInstance;
}

export default PostVisitReviewTrigger;
