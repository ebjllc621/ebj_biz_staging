/**
 * POST /api/offers/[id]/dispute
 * GET /api/offers/[id]/dispute
 *
 * Dispute/Support flow for redemption issues
 *
 * @tier STANDARD
 * @phase TD-P3-008 - Dispute/Support Flow
 * @authority Phase 3 Brain Plan
 */

import { getOfferService, getListingService, getDatabaseService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * POST handler - Create a new dispute
 *
 * Auth: Authenticated user (must own the claim)
 * Body: { claimId: number, reason: string, details?: string }
 * Returns: OfferDispute
 *
 * @example
 * POST /api/offers/123/dispute
 * Body: { "claimId": 456, "reason": "code_not_working", "details": "The code was rejected at checkout" }
 */
export const POST = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to report a problem');
  }

  // Parse request body
  const body = await context.request.json();
  const { claimId, reason, details } = body;

  if (!claimId || typeof claimId !== 'number') {
    throw BizError.badRequest('claimId is required and must be a number');
  }

  const validReasons = ['code_not_working', 'already_used', 'wrong_offer', 'technical_issue', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    throw BizError.badRequest(`reason must be one of: ${validReasons.join(', ')}`);
  }

  // Create dispute
  const offerService = getOfferService();
  const dispute = await offerService.createRedemptionDispute(
    claimId,
    user.id,
    reason as 'code_not_working' | 'already_used' | 'wrong_offer' | 'technical_issue' | 'other',
    details
  );

  return createSuccessResponse(dispute);
});

/**
 * GET handler - Get disputes for an offer (business owner)
 *
 * Auth: Listing owner
 * Returns: OfferDispute[]
 *
 * @example
 * GET /api/offers/123/dispute
 * Response: { data: [...disputes] }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to view disputes');
  }

  // Extract offerId from URL path
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

  // Get disputes
  const offerService = getOfferService();
  const disputes = await offerService.getOfferDisputes(offerId);

  return createSuccessResponse(disputes);
});
