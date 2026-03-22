/**
 * Unified Sharing Stats API Route
 * GET /api/contacts/rewards/unified - Get unified sharing statistics
 *
 * @tier SIMPLE
 * @phase Unified Gamification - Phase 5
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_5_BRAIN_PLAN.md
 * @reference src/app/api/contacts/rewards/route.ts - API pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts/rewards/unified
 * Get unified sharing stats (referrals + recommendations)
 *
 * @authenticated Required
 * @returns {UnifiedSharingStats} Combined stats from both systems
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  const stats = await service.getUnifiedSharingStats(userId);

  return createSuccessResponse(stats, context.requestId);
}, {
  requireAuth: true
});
