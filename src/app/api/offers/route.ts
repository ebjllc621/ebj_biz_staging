/**
 * Offers API Routes (User-Facing)
 * GET /api/offers - Retrieve offers with filters (public)
 * POST /api/offers - Create new offer (user-facing with tier enforcement)
 *
 * @authority PHASE_5.4.1_BRAIN_PLAN.md
 * @authority PHASE_7_BRAIN_PLAN.md - GET endpoint for listing offers
 * @governance 100% authentication gating on POST (listing_member, admin)
 * @governance Tier enforcement (4-50 offers based on subscription)
 * @pattern Exact replication of POST /api/listings pattern
 */

// PATTERN: Imports from @reference src/app/api/listings/route.ts
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { OfferType } from '@core/services/OfferService';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/offers
 * Get all offers with optional filters
 * Query parameters:
 *   - listingId: Filter by listing ID
 *   - is_featured: Filter by featured status (true/false)
 *   - offerType: Filter by offer type (product, service, discount, bundle)
 *   - status: Filter by status (active, expired, sold_out)
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 10)
 *
 * @public No authentication required
 * @pattern Replicated from GET /api/events
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse filters from query parameters
  const filters: Record<string, unknown> = {};

  const listingIdParam = searchParams.get('listingId');
  if (listingIdParam !== null) {
    const listingId = parseInt(listingIdParam);
    if (isNaN(listingId)) {
      throw BizError.badRequest('Invalid listingId parameter', { listingId: listingIdParam });
    }
    filters.listingId = listingId;
  }

  const isFeaturedParam = searchParams.get('is_featured');
  if (isFeaturedParam !== null) {
    filters.is_featured = isFeaturedParam === 'true';
  }

  const offerTypeParam = searchParams.get('offerType');
  if (offerTypeParam !== null) {
    filters.offerType = offerTypeParam;
  }

  const statusParam = searchParams.get('status');
  if (statusParam !== null) {
    filters.status = statusParam;
  }

  const isMockParam = searchParams.get('isMock');
  if (isMockParam !== null) {
    filters.isMock = isMockParam === 'true';
  }

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw BizError.badRequest('Invalid limit parameter', { limit: searchParams.get('limit') });
  }

  // Get offers from service
  const offerService = getOfferService();
  const result = await offerService.getAll(filters, { page, limit });

  return createSuccessResponse(result, context.requestId);
}, {
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/offers - Create new offer (user-facing)
 *
 * @governance Authentication required (listing_member or admin)
 * @governance Ownership verification (user owns the listing)
 * @governance Tier limit enforcement (SERVER-SIDE)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // PATTERN: Session extraction from @reference POST /api/listings (lines 82-96)
  const user = await getUserFromRequest(request);

  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  // GOVERNANCE: Account type check - listing_member or admin only
  if (!isListingMember(user)) {
    return createErrorResponse(
      BizError.forbidden('create offers', 'offers'),
      context.requestId
    );
  }

  const body = await request.json();

  // PATTERN: Service initialization from @reference POST /api/listings (lines 102-114)
  const offerService = getOfferService();
  const listingService = getListingService();

  try {
    // GOVERNANCE: Verify listing ownership
    const listing = await listingService.getById(body.listing_id);
    if (!listing || listing.user_id !== user.id) {
      return createErrorResponse(
        BizError.forbidden('create offers for this listing', 'listing'),
        context.requestId
      );
    }

    // GOVERNANCE: Tier limit check (SERVER-SIDE) - PATTERN from @reference POST /api/listings
    const tierCheck = await offerService.checkOfferLimit(listing.id);
    if (!tierCheck.allowed) {
      return createErrorResponse(
        BizError.badRequest(
          `${tierCheck.tier} tier allows maximum ${tierCheck.limit} offers. Upgrade to create more.`,
          { tier: tierCheck.tier, limit: tierCheck.limit }
        ),
        context.requestId
      );
    }

    // Create offer
    const offer = await offerService.create(listing.id, {
      title: body.title,
      slug: body.slug,
      description: body.description,
      offer_type: body.offer_type as OfferType,
      original_price: body.original_price,
      sale_price: body.discounted_price ?? body.sale_price,
      discount_percentage: body.discount_percentage,
      image: body.image,
      thumbnail: body.thumbnail,
      start_date: body.start_date,
      end_date: body.end_date,
      quantity_total: body.quantity_total,
      quantity_remaining: body.quantity_remaining,
      max_per_user: body.max_per_user,
      redemption_code: body.redemption_code,
      redemption_instructions: body.redemption_instructions,
      terms_conditions: body.terms_conditions,
      is_featured: body.is_featured,
      is_mock: body.is_mock
    });

    return createSuccessResponse(
      { offer: { id: offer.id }, message: 'Offer created successfully' },
      context.requestId
    );
  } catch (error) {
    return createErrorResponse(
      error instanceof BizError ? error : BizError.internalServerError('OfferService', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
}, {
  allowedMethods: ['GET', 'POST']
}));
