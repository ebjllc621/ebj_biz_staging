/**
 * POST /api/users/connections/recommendations/feedback/relevance
 *
 * Submit recommendation relevance feedback
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const POST = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const body = await context.request.json();

  if (!body.recommendedUserId) {
    throw BizError.badRequest('recommendedUserId is required');
  }

  if (!body.action) {
    throw BizError.badRequest('action is required');
  }

  const analyticsService = getRecommendationAnalyticsService();

  await analyticsService.recordRelevanceFeedback({
    userId,
    recommendedUserId: body.recommendedUserId,
    action: body.action,
    relevanceRating: body.relevanceRating ?? null,
    reasonsHelpful: body.reasonsHelpful ?? null,
    feedbackText: body.feedbackText,
    variantId: body.variantId ?? null
  });

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true
});
