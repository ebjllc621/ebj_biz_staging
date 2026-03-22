/**
 * POST /api/users/connections/recommendations/analytics/events
 *
 * Batch track recommendation analytics events
 *
 * @phase Phase 8F
 */
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getRecommendationAnalyticsService } from '@core/services/ServiceRegistry';

export const POST = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);
  const body = await context.request.json();

  if (!body.events || !Array.isArray(body.events)) {
    throw BizError.badRequest('events array is required');
  }

  const analyticsService = getRecommendationAnalyticsService();

  const eventsToTrack = body.events.map((event: any) => ({
    eventType: event.eventType,
    userId,
    recommendedUserId: event.recommendedUserId,
    score: event.score,
    position: event.position,
    source: event.source,
    variantId: event.variantId,
    sessionId: event.sessionId,
    dwellTimeMs: event.dwellTimeMs,
    reasons: event.reasons,
    metadata: event.metadata
  }));

  const tracked = await analyticsService.trackEventsBatch(eventsToTrack);

  return createSuccessResponse({ tracked }, context.requestId);
}, {
  requireAuth: true
});
