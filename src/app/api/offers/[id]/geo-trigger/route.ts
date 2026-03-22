/**
 * POST /api/offers/[id]/geo-trigger
 * Add geo-fence trigger to offer
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { GeoFenceTrigger } from '@features/offers/types';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/offers/[id]/geo-trigger
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();

  const offerService = getOfferService();
  // addGeoTrigger to be implemented in OfferService
  const trigger: GeoFenceTrigger = {
    id: 0,
    offer_id: parseInt(offerId, 10),
    latitude: body.latitude,
    longitude: body.longitude,
    radius_meters: body.radius_meters || 500,
    notification_message: body.notification_message,
    is_active: true,
    created_at: new Date(),
  };

  return createSuccessResponse({ trigger }, context.requestId);
});

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // getGeoTriggers to be implemented in OfferService
  const triggers: GeoFenceTrigger[] = [];

  return createSuccessResponse({ triggers }, context.requestId);
});
