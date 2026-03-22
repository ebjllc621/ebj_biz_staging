/**
 * Rewards API Route
 * GET /api/contacts/rewards - Get user's reward summary
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/referrals/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/rewards
 * Get complete unified reward summary for authenticated user (Phase 5 Update)
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  // Phase 5: Returns unified summary with recommendation stats
  const summary = await service.getUnifiedRewardSummary(userId);

  return createSuccessResponse(summary, context.requestId);
}, {
  requireAuth: true
});
