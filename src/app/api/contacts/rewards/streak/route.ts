/**
 * GET /api/contacts/rewards/streak
 * Returns streak status and tier information
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - apiHandler mandate
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const rewardService = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  // Get streak status
  const streakStatus = await rewardService.getStreakStatus(userId);

  // Get tier status
  const tierStatus = await rewardService.getTierStatus(userId);

  return createSuccessResponse({
    streak: streakStatus,
    tier: tierStatus
  }, context.requestId);
}, {
  requireAuth: true
});
