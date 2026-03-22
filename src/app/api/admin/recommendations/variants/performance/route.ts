/**
 * GET /api/admin/recommendations/variants/performance
 *
 * Get performance comparison for all algorithm variants
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' (default: 'week')
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const period = (url.searchParams.get('period') as 'day' | 'week' | 'month') || 'week';

  const analyticsService = getRecommendationAnalyticsService();
  const variants = await analyticsService.getAlgorithmVariants(true);

  // Get performance for each variant
  const performance = await Promise.all(
    variants.map((variant: any) =>
      analyticsService.getAlgorithmPerformance(variant.variantId, period)
    )
  );

  return createSuccessResponse(performance, context.requestId);
}, {
  requireAuth: true
});
