/**
 * GET /api/listings/[id]/offers/analytics/comparison
 *
 * Get offer performance comparison for a listing
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch offer comparison
 *
 * Auth: Listing owner or admin
 * Returns: OfferComparison[]
 *
 * @example
 * GET /api/listings/123/offers/analytics/comparison
 * Response: { data: [{ offerId, title, status, metrics, rank, percentile }] }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to view analytics');
  }

  // Extract listingId from URL path: /api/listings/[id]/offers/analytics/comparison
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1] || '';
  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdStr });
  }

  // Verify listing ownership
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);

  if (!listing) {
    throw BizError.notFound('Listing', listingId);
  }

  if (listing.user_id !== user.id) {
    throw BizError.forbidden('You do not own this listing');
  }

  // Get offer comparison
  const offerService = getOfferService();
  const comparisons = await offerService.getOfferComparison(listingId);

  return createSuccessResponse(comparisons);
});
