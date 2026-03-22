/**
 * Individual Offer API Routes (User-Facing)
 * PUT /api/offers/[id] - Update offer (user-facing with ownership verification)
 * DELETE /api/offers/[id] - Delete offer (user-facing with ownership verification)
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md
 * @governance 100% authentication gating
 * @governance Ownership verification required
 * @pattern Exact replication of POST /api/listings pattern
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * PUT /api/offers/[id] - Update offer (user-facing)
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // PATTERN: Session extraction from @reference POST /api/listings
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('update offers', 'offers'),
      context.requestId
    );
  }

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerIdStr = pathSegments[pathSegments.length - 1] || '';
  const offerId = parseInt(offerIdStr);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID', { offerId: offerIdStr }),
      context.requestId
    );
  }

  const body = await request.json();

  // PATTERN: Service initialization from @reference POST /api/listings
  
  
  
  const listingService = getListingService();
  const offerService = getOfferService();

  try {
    // GOVERNANCE: Verify ownership (user owns the listing that owns the offer)
    const offer = await offerService.getById(offerId);
    if (!offer) {
      return createErrorResponse(
        BizError.notFound('Offer', offerId),
        context.requestId
      );
    }

    const listing = await listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('update offers for this listing', 'listing'),
        context.requestId
      );
    }

    // Update offer
    await offerService.update(offerId, body);

    return createSuccessResponse(
      { message: 'Offer updated successfully' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}));

/**
 * DELETE /api/offers/[id] - Delete offer (user-facing)
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // PATTERN: Session extraction from @reference POST /api/listings
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('delete offers', 'offers'),
      context.requestId
    );
  }

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerIdStr = pathSegments[pathSegments.length - 1] || '';
  const offerId = parseInt(offerIdStr);

  if (isNaN(offerId)) {
    return createErrorResponse(
      BizError.badRequest('Invalid offer ID', { offerId: offerIdStr }),
      context.requestId
    );
  }

  // PATTERN: Service initialization from @reference POST /api/listings
  
  
  
  const listingService = getListingService();
  const offerService = getOfferService();

  try {
    // GOVERNANCE: Verify ownership (user owns the listing that owns the offer)
    const offer = await offerService.getById(offerId);
    if (!offer) {
      return createErrorResponse(
        BizError.notFound('Offer', offerId),
        context.requestId
      );
    }

    const listing = await listingService.getById(offer.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('delete offers for this listing', 'listing'),
        context.requestId
      );
    }

    // Delete offer
    await offerService.delete(offerId);

    return createSuccessResponse(
      { message: 'Offer deleted successfully' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}));
