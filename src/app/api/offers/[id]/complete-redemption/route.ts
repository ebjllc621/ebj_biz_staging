/**
 * POST /api/offers/[id]/complete-redemption
 *
 * Complete offer redemption after verification
 *
 * @tier ADVANCED
 * @phase Phase 3 - Redemption Verification
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getListingService, getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { RedemptionMethod } from '@features/offers/types';

/**
 * POST handler - Complete redemption with method
 *
 * Auth: Business owner (listing ownership check)
 * Body: { claimId: number, method: RedemptionMethod }
 * Returns: RedemptionResult
 *
 * Side effects:
 * - Update claim status to 'redeemed'
 * - Track redemption analytics
 * - Send notification to user
 *
 * @example
 * POST /api/offers/123/complete-redemption
 * Body: { claimId: 456, method: "qr_scan" }
 * Response: { data: { success, claimId, redemptionMethod, redeemedAt, message } }
 */
export const POST = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to complete redemptions');
  }

  // Extract offerId from URL path: /api/offers/[id]/complete-redemption
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const offerIdStr = pathParts[pathParts.indexOf('offers') + 1] || '';
  const offerId = parseInt(offerIdStr, 10);

  if (isNaN(offerId)) {
    throw BizError.badRequest('Invalid offer ID', { id: offerIdStr });
  }

  // Parse request body
  const body = await context.request.json();
  const { claimId, method } = body;

  if (!claimId || typeof claimId !== 'number') {
    throw BizError.badRequest('Valid claim ID is required', { claimId });
  }

  if (!method || !['qr_scan', 'manual_entry', 'in_app', 'self_reported'].includes(method)) {
    throw BizError.badRequest('Valid redemption method is required', { method });
  }

  // Verify offer exists and user owns the listing
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

  // Verify claim belongs to this offer
  const claimResult = await db.query<{ offer_id: number }>(
    'SELECT offer_id FROM offer_claims WHERE id = ?',
    [claimId]
  );

  if (claimResult.rows.length === 0) {
    throw BizError.notFound('Claim', claimId);
  }

  if (claimResult.rows[0]?.offer_id !== offerId) {
    throw BizError.badRequest('Claim does not belong to this offer', {
      claimId,
      offerId
    });
  }

  // Complete redemption
  const offerService = getOfferService();
  const result = await offerService.completeRedemption(
    claimId,
    method as RedemptionMethod,
    user.id
  );

  return createSuccessResponse(result);
});
