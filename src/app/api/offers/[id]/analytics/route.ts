/**
 * Offer Analytics Tracking API Route
 *
 * POST /api/offers/[id]/analytics - Track analytics event
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: OfferService
 * - Auth optional (anonymous events allowed)
 *
 * @authority CLAUDE.md - API Standards
 * @authority Phase 1 Brain Plan - Section 3.1.4
 * @phase Offers Phase 1 - Core CRUD & Display
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import type { AnalyticsEventType, AnalyticsSource } from '@features/offers/types';

/**
 * POST /api/offers/[id]/analytics
 * Track analytics event for an offer
 *
 * @auth Optional (allows anonymous tracking)
 * @body { event_type: AnalyticsEventType, source?: AnalyticsSource }
 * @response { data: { tracked: true } }
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - URL format: /api/offers/[id]/analytics
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerIdStr = pathSegments[pathSegments.length - 2] || '';
  const offerId = parseInt(offerIdStr);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID'),
      400
    );
  }

  // Parse request body
  let body: { event_type?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Request body is required'),
      400
    );
  }

  const eventType = body.event_type as AnalyticsEventType;
  const source = body.source as AnalyticsSource | undefined;

  if (!eventType) {
    return createErrorResponse(
      BizError.badRequest('event_type is required'),
      400
    );
  }

  // Validate event type
  const validEventTypes: AnalyticsEventType[] = ['impression', 'page_view', 'engagement', 'share', 'claim', 'redemption'];
  if (!validEventTypes.includes(eventType)) {
    return createErrorResponse(
      BizError.badRequest(`Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`),
      400
    );
  }

  // Check if user is authenticated (optional)
  const user = await getUserFromRequest(request);
  const userId = user?.id;

  // Initialize service
  const offerService = getOfferService();

  // Track analytics
  await offerService.trackAnalytics(offerId, eventType, userId, source);

  return createSuccessResponse({
    tracked: true
  }, 200);
});
