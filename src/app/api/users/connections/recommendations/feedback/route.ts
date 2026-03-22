import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationService } from '@core/services/ServiceRegistry';
import { RecommendationFeedback } from '@features/connections/types';
import { BizError } from '@core/errors/BizError';

/**
 * POST /api/users/connections/recommendations/feedback
 *
 * Record user feedback on a connection recommendation
 *
 * Body:
 * - recommended_user_id: number (required)
 * - action: 'connected' | 'dismissed' | 'not_interested' (required)
 * - not_interested_reason: string (optional, required if action is 'not_interested')
 * - other_reason: string (optional)
 *
 * @phase ConnectP2 Phase 2
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  // Parse request body
  const body = await context.request.json();

  const {
    recommended_user_id,
    action,
    not_interested_reason,
    other_reason
  } = body;

  // Validate required fields
  if (!recommended_user_id || typeof recommended_user_id !== 'number') {
    throw BizError.badRequest('recommended_user_id is required and must be a number');
  }

  if (!action || !['connected', 'dismissed', 'not_interested'].includes(action)) {
    throw BizError.badRequest('action must be one of: connected, dismissed, not_interested');
  }

  // Validate not_interested_reason if action is 'not_interested'
  // GOVERNANCE: Values MUST match DB enum - enum('dont_know','not_relevant','spam','already_contacted','other')
  if (action === 'not_interested') {
    const validReasons = [
      'dont_know',
      'not_relevant',
      'spam',
      'already_contacted',
      'other'
    ];

    if (!not_interested_reason || !validReasons.includes(not_interested_reason)) {
      throw BizError.badRequest(
        'not_interested_reason is required for not_interested action and must be one of: ' + validReasons.join(', ')
      );
    }

    // Validate other_reason if not_interested_reason is 'other'
    if (not_interested_reason === 'other' && !other_reason) {
      throw BizError.badRequest('other_reason is required when not_interested_reason is "other"');
    }
  }

  const recommendationService = getRecommendationService();

  const feedback: RecommendationFeedback = {
    user_id: userId,
    recommended_user_id,
    action,
    not_interested_reason: not_interested_reason || undefined,
    other_reason: other_reason || undefined
  };

  await recommendationService.recordFeedback(feedback);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true
});
