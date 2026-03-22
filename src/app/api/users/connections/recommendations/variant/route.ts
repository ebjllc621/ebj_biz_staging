/**
 * GET /api/users/connections/recommendations/variant
 *
 * Get algorithm variant assigned to user
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const analyticsService = getRecommendationAnalyticsService();

  const variantId = await analyticsService.getVariantForUser(userId);
  const weightOverrides = await analyticsService.getVariantWeightOverrides(variantId);

  return createSuccessResponse({
    variantId,
    weightOverrides
  }, context.requestId);
}, {
  requireAuth: true
});
