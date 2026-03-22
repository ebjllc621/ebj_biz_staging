/**
 * GET /api/listings/[id]/loyal-customers
 * Get listing's loyal customers (business owner view)
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { LoyalCustomer } from '@features/offers/types';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/listings/[id]/loyal-customers
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const listingId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // Loyal customers to be implemented in OfferService
  const customers: LoyalCustomer[] = [];

  return createSuccessResponse({ customers }, context.requestId);
});
