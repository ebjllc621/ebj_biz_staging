/**
 * GET /api/offers/[id]/export/analytics
 *
 * Export offer analytics to CSV with tier-based access control
 *
 * @tier ADVANCED
 * @phase Phase 3 - Export & Polish
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getListingService, getDatabaseService } from '@core/services/ServiceRegistry';
import { OfferExportService } from '@core/services/OfferExportService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { ExportFilters } from '@features/offers/types';

/**
 * GET handler - Export analytics CSV
 *
 * Auth: Listing owner
 * Query: ?startDate={ISO}&endDate={ISO}
 * Returns: CSVExportResult
 *
 * Tier restrictions: Same as claims export
 *
 * @example
 * GET /api/offers/123/export/analytics?startDate=2024-01-01T00:00:00Z
 * Response: { data: { csv, filename, rowCount, generatedAt } }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to export data');
  }

  // Extract offerId from URL path: /api/offers/[id]/export/analytics
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

  // Parse filters
  const searchParams = context.request.nextUrl.searchParams;
  const filters: ExportFilters = {};

  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (startDateStr) filters.startDate = new Date(startDateStr);
  if (endDateStr) filters.endDate = new Date(endDateStr);

  // Export via OfferExportService
  const listingService = getListingService();
  const offerService = getOfferService();
  const exportService = new OfferExportService(db, listingService, offerService);

  const result = await exportService.exportShareClicks(offerId, listingId, user.id, filters);

  return createSuccessResponse(result);
});
