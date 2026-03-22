/**
 * GET /api/sharing/recommendations/impact
 * Phase 4 - Get sender's recommendation impact statistics
 *
 * @tier SIMPLE
 * @phase User Recommendations - Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  try {
    const [stats, recentFeedback] = await Promise.all([
      sharingService.getImpactStats(userId),
      sharingService.getReceivedFeedback(userId, 10)
    ]);

    return createSuccessResponse({
      stats,
      recent_feedback: recentFeedback
    }, context.requestId);
  } catch (error) {
    if (error instanceof BizError) {
      return createErrorResponse(error, context.requestId);
    }
    return createErrorResponse(
      new BizError({ code: 'INTERNAL_ERROR', message: 'Failed to get impact stats' }),
      context.requestId
    );
  }
}, { requireAuth: true });
