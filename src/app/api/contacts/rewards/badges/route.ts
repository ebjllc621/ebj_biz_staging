/**
 * Badges API Route
 * GET /api/contacts/rewards/badges - Get all badges with status
 * POST /api/contacts/rewards/badges - Sync/refresh badges (award missing)
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/rewards/badges
 * Get all badges with earned status for user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  const badges = await service.getAllBadgesWithStatus(userId);

  return createSuccessResponse({ badges }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/contacts/rewards/badges
 * Sync badges - checks and awards any missing badges the user is eligible for.
 * Call this to backfill badges that weren't awarded previously.
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  // Get stats before awarding for debugging
  const statsBefore = await service.getUnifiedSharingStats(userId);
  console.log('[Badge Sync] User stats:', {
    userId,
    recommendations_sent: statsBefore.total_recommendations_sent,
    listing: statsBefore.listing_recommendations,
    event: statsBefore.event_recommendations,
    user: statsBefore.user_recommendations
  });

  // Check and award any eligible badges
  const newlyAwarded = await service.checkAndAwardBadges(userId);
  console.log('[Badge Sync] Newly awarded:', newlyAwarded.map(b => b.badge_name));

  // Return updated badge list
  const badges = await service.getAllBadgesWithStatus(userId);

  // Debug: count earned vs unearned
  const earnedCount = badges.filter(b => b.earned).length;
  console.log('[Badge Sync] Badge status:', { total: badges.length, earned: earnedCount });

  return createSuccessResponse({
    badges,
    newlyAwarded: newlyAwarded.map(b => ({
      id: b.badge_type,
      name: b.badge_name
    })),
    message: newlyAwarded.length > 0
      ? `Awarded ${newlyAwarded.length} new badge(s)!`
      : 'All badges up to date',
    debug: {
      stats: {
        recommendations_sent: statsBefore.total_recommendations_sent,
        listing: statsBefore.listing_recommendations
      },
      earnedCount
    }
  }, context.requestId);
}, {
  requireAuth: true
});
