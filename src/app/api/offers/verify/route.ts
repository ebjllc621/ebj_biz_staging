/**
 * GET /api/offers/verify
 *
 * Verify redemption code for an offer
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

/**
 * GET handler - Verify redemption code
 *
 * Auth: Business owner or admin
 * Query: ?code={promoCode}&offerId={offerId}
 * Returns: RedemptionVerification
 *
 * Use case: QR scan or manual code entry redirects here for validation
 *
 * @example
 * GET /api/offers/verify?code=PROMO-123&offerId=456
 * Response: { data: { valid, claim, error, offer, user } }
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('You must be logged in to verify codes');
  }

  const searchParams = context.request.nextUrl.searchParams;
  const promoCode = searchParams.get('code');
  const offerIdStr = searchParams.get('offerId');

  if (!promoCode) {
    throw BizError.badRequest('Promo code is required', { code: promoCode });
  }

  if (!offerIdStr) {
    throw BizError.badRequest('Offer ID is required', { offerId: offerIdStr });
  }

  const offerId = parseInt(offerIdStr, 10);
  if (isNaN(offerId)) {
    throw BizError.badRequest('Invalid offer ID', { offerId: offerIdStr });
  }

  // Get offer and verify user owns the listing
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

  // Verify redemption code
  const offerService = getOfferService();
  const verification = await offerService.verifyRedemptionCode(promoCode, listingId);

  return createSuccessResponse(verification);
});
