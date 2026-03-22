/**
 * GET /api/admin/recommendations/metrics/realtime
 *
 * Get real-time recommendation metrics for admin dashboard
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const analyticsService = getRecommendationAnalyticsService();
  const metrics = await analyticsService.getRealtimeMetrics();

  return createSuccessResponse(metrics, context.requestId);
}, {
  requireAuth: true
});
