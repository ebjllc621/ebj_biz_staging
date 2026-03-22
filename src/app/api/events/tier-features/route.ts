/**
 * Event Tier Features API Route
 * GET /api/events/tier-features?listingId=X
 * Returns tier-gated feature access for a listing's events
 *
 * Used by EventFormModal to show/hide/disable form fields by tier
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Service layer: EventService.checkTierFeatureAccess()
 * - Authentication: Required (business owner must be authenticated)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 1A Gap-Fill
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getEventService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

const eventService = getEventService();

/**
 * GET /api/events/tier-features?listingId=X
 * Returns tier-gated feature access for the listing
 *
 * @authenticated Required - must be logged in
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingIdParam = url.searchParams.get('listingId');

  if (!listingIdParam) {
    throw BizError.badRequest('listingId query parameter is required');
  }

  const listingId = parseInt(listingIdParam, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listingId parameter', { listingId: listingIdParam });
  }

  const tierFeatures = await eventService.checkTierFeatureAccess(listingId);

  return createSuccessResponse(tierFeatures, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
