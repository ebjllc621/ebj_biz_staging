/**
 * GET /api/offers/[id]/analytics/funnel
 *
 * Get analytics funnel data for an offer
 *
 * @tier ADVANCED
 * @phase Phase 3 - Analytics Dashboard
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getListingService, getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch analytics funnel
 *
 * Auth: Listing owner or admin
 * Query: ?startDate={ISO}&endDate={ISO}
 * Returns: AnalyticsFunnel
 *
 * @example
 * GET /api/offers/123/analytics/funnel?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
 * Response: { data: { offerId, period, stages, conversionRates, dropOffRates } }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to view analytics');
  }

  // Extract offerId from URL path: /api/offers/[id]/analytics/funnel
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const offerIdStr = pathParts[pathParts.indexOf('offers') + 1] || '';
  const offerId = parseInt(offerIdStr, 10);

  if (isNaN(offerId)) {
    throw BizError.badRequest('Invalid offer ID', { id: offerIdStr });
  }

  // Get offer and verify ownership
  const db = getDatabaseService();
  const offerResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM offers WHERE id = ?',
    [offerId]
  );

  if (offerResult.rows.length === 0) {
    throw BizError.notFound('Offer', offerId);
  }

  const listingId = offerResult.rows[0]?.listing_id;
  if (!listingId) {
    throw BizError.notFound('Listing for offer', offerId);
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

  // Parse date range
  const searchParams = context.request.nextUrl.searchParams;
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  // Get funnel data
  const offerService = getOfferService();
  const funnel = await offerService.getAnalyticsFunnel(offerId, startDate, endDate);

  return createSuccessResponse(funnel);
});
