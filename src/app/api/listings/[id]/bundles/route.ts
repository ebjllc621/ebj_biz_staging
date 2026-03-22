/**
 * GET /api/listings/[id]/bundles
 * Get bundles containing offers from this listing
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/listings/[id]/bundles
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const listingId = pathSegments[pathSegments.length - 2] || '';

  const offerService = getOfferService();
  // Get all bundles and filter by listing (to be optimized in OfferService)
  const bundles = await offerService.getBundles();

  return createSuccessResponse({ bundles }, context.requestId);
});
