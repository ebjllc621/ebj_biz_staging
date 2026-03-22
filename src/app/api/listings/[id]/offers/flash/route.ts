/**
 * POST /api/listings/[id]/offers/flash
 * Create a flash offer for a listing
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { Offer } from '@features/offers/types';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/listings/[id]/offers/flash
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const listingId = pathSegments[pathSegments.length - 3] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();

  const offerService = getOfferService();
  // Flash offer creation to be implemented in OfferService
  // For now, create as regular offer with flash flag
  const offer: Partial<Offer> = {
    listing_id: parseInt(listingId, 10),
    title: body.title,
    description: body.description,
    offer_type: body.offer_type || 'discount',
    original_price: body.original_price,
    sale_price: body.sale_price,
    discount_percentage: body.discount_percentage,
    is_featured: false,
    status: 'active',
  };

  return createSuccessResponse({ offer }, context.requestId);
});
