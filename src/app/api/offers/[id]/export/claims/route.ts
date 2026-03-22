/**
 * GET /api/offers/[id]/export/claims
 *
 * Export offer claims to CSV with tier-based access control
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
 * GET handler - Export claims CSV
 *
 * Auth: Listing owner
 * Query: ?startDate={ISO}&endDate={ISO}&status={status}&includeEmail={boolean}
 * Returns: CSVExportResult
 *
 * Tier restrictions:
 * - Essentials: No export
 * - Plus: 50/month, email access
 * - Preferred: 500/month, email access
 * - Premium: Unlimited, email access
 *
 * @example
 * GET /api/offers/123/export/claims?includeEmail=true&status=claimed
 * Response: { data: { csv, filename, rowCount, generatedAt } }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to export data');
  }

  // Extract offerId from URL path: /api/offers/[id]/export/claims
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
  const status = searchParams.get('status');
  const includeEmail = searchParams.get('includeEmail');

  if (startDateStr) filters.startDate = new Date(startDateStr);
  if (endDateStr) filters.endDate = new Date(endDateStr);
  if (status) filters.status = status as 'claimed' | 'redeemed' | 'expired';
  if (includeEmail) filters.includeEmail = includeEmail === 'true';

  // Export via OfferExportService
  const listingService = getListingService();
  const offerService = getOfferService();
  const exportService = new OfferExportService(db, listingService, offerService);

  const result = await exportService.exportClaims(offerId, listingId, user.id, filters);

  return createSuccessResponse(result);
});
