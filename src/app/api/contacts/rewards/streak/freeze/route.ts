/**
 * POST /api/contacts/rewards/streak/freeze
 * Use a streak freeze to protect current streak
 *
 * Phase 7: Streaks & Tier Progression
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - apiHandler mandate
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';

export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const rewardService = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    // Use streak freeze
    const result = await rewardService.useStreakFreeze(userId);

    // Get updated streak status
    const streakStatus = await rewardService.getStreakStatus(userId);

    return createSuccessResponse({
      message: result.message,
      streak: streakStatus
    }, context.requestId);
  } catch (error) {
    console.error('Error using streak freeze:', error);

    // Check for specific error types from BizError
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }

    // Generic error fallback
    return createErrorResponse(
      new BizError({
        code: 'STREAK_FREEZE_ERROR',
        message: 'Failed to use streak freeze'
      }),
      context.requestId
    );
  }
}, {
  requireAuth: true
});
