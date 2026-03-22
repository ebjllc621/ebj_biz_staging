/**
 * GET /api/admin/recommendations/metrics/funnel
 *
 * Get conversion funnel metrics
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' (required)
 * - variantId: string (optional)
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const period = url.searchParams.get('period') as 'day' | 'week' | 'month';
  const variantId = url.searchParams.get('variantId') || undefined;

  if (!period || !['day', 'week', 'month'].includes(period)) {
    throw BizError.badRequest('period must be one of: day, week, month');
  }

  const analyticsService = getRecommendationAnalyticsService();
  const metrics = await analyticsService.getFunnelMetrics(period, variantId);

  return createSuccessResponse(metrics, context.requestId);
}, {
  requireAuth: true
});
