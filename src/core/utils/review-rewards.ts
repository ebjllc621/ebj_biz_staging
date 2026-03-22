/**
 * Review Reward Points Helper
 *
 * Fire-and-forget reward point tracking for review submissions.
 * Called from all review API routes after successful review creation.
 *
 * @authority CLAUDE.md - Reward Points Integration
 * @phase Review System Enhancement
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { REVIEW_REWARD_POINTS } from '@features/contacts/types/reward';

/**
 * Award reward points for a review submission (fire-and-forget).
 * Calculates base + bonus points and inserts into user_rewards table.
 *
 * @param userId - The user who submitted the review
 * @param options - Review details for bonus calculation
 */
export function awardReviewPoints(
  userId: number,
  options: {
    reviewText?: string | null;
    images?: string[] | null;
    entityType: string;
    entityId: number;
  }
): void {
  // Fire-and-forget — do not await, do not block the response
  (async () => {
    try {
      const db = getDatabaseService();

      // Calculate points
      let totalPoints = REVIEW_REWARD_POINTS.review_submitted; // Base: 10 points
      const bonuses: string[] = [];

      // Bonus for including review text (min 20 chars)
      if (options.reviewText && options.reviewText.trim().length >= 20) {
        totalPoints += REVIEW_REWARD_POINTS.review_with_text; // +5
        bonuses.push('text');
      }

      // Bonus for including media (images or video)
      if (options.images && options.images.length > 0) {
        totalPoints += REVIEW_REWARD_POINTS.review_with_media; // +5
        bonuses.push('media');
      }

      const description = `Review submitted on ${options.entityType} #${options.entityId}` +
        (bonuses.length > 0 ? ` (bonuses: ${bonuses.join(', ')})` : '');

      await db.query(
        `INSERT INTO user_rewards (user_id, reward_type, points_earned, description, created_at)
         VALUES (?, 'review_submitted', ?, ?, NOW())`,
        [userId, totalPoints, description]
      );

      // Check for review count badges
      const countResult = await db.query<{ review_count: bigint | number }>(
        `SELECT COUNT(*) as review_count FROM user_rewards
         WHERE user_id = ? AND reward_type = 'review_submitted'`,
        [userId]
      );

      const reviewCount = Number(countResult.rows[0]?.review_count || 0);

      // Badge thresholds
      const badgeThresholds = [
        { count: 1, id: 'first_review', name: 'First Impression', icon: '✍️', desc: 'Submitted your first review' },
        { count: 5, id: 'review_5', name: 'Regular Reviewer', icon: '📝', desc: 'Submitted 5 reviews' },
        { count: 10, id: 'review_10', name: 'Trusted Reviewer', icon: '⭐', desc: 'Submitted 10 reviews' },
        { count: 25, id: 'review_25', name: 'Review Champion', icon: '🏅', desc: 'Submitted 25 reviews' },
        { count: 50, id: 'review_50', name: 'Review Legend', icon: '🏆', desc: 'Submitted 50 reviews' },
      ];

      for (const badge of badgeThresholds) {
        if (reviewCount >= badge.count) {
          // INSERT IGNORE via ON DUPLICATE KEY (uk_user_badge prevents duplicates)
          await db.query(
            `INSERT INTO user_badges (user_id, badge_type, badge_name, badge_icon, badge_description, badge_category, earned_at)
             VALUES (?, ?, ?, ?, ?, 'review', NOW())
             ON DUPLICATE KEY UPDATE earned_at = earned_at`,
            [userId, badge.id, badge.name, badge.icon, badge.desc]
          );
        }
      }
    } catch {
      // Silently fail — reward tracking should never block review submission
    }
  })();
}
