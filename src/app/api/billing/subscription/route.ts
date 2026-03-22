/**
 * Billing Subscription API Route
 * GET /api/billing/subscription - Get active subscription for a listing
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 2
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BillingService } from '@core/services/BillingService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/subscription
 * Get the active subscription for a listing owned by the authenticated user
 * Query params: listing_id (required)
 *
 * @authenticated Required
 * @csrf Not required (read-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const url = new URL((context.request as NextRequest).url);
  const listingIdParam = url.searchParams.get('listing_id');

  if (!listingIdParam) {
    throw BizError.validation('listing_id', undefined, 'listing_id query parameter is required');
  }

  const listingId = parseInt(listingIdParam, 10);
  if (isNaN(listingId)) {
    throw BizError.validation('listing_id', listingIdParam, 'listing_id must be a valid integer');
  }

  const db = getDatabaseService();
  const service = new BillingService(db);

  // Validate ownership before returning subscription data
  await service.validateListingOwnership(user.id, listingId);

  const subscription = await service.getSubscriptionForListing(listingId);

  return createSuccessResponse({ subscription }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
