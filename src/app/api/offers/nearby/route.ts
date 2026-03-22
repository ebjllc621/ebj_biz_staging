/**
 * GET /api/offers/nearby
 * Get offers near user location
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  try {
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radius = url.searchParams.get('radius');

    if (!lat || !lng) {
      return createErrorResponse(
        BizError.badRequest('Latitude and longitude are required'),
        context.requestId
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radius ? parseInt(radius, 10) : 500;

    if (isNaN(latitude) || isNaN(longitude)) {
      return createErrorResponse(
        BizError.badRequest('Invalid coordinates'),
        context.requestId
      );
    }

    const offerService = getOfferService();
    const offers = await offerService.getNearbyOffers(latitude, longitude, radiusMeters);

    return createSuccessResponse({ offers }, context.requestId);
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
});
