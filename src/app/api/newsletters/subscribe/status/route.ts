/**
 * Newsletter Subscription Status API
 *
 * GET /api/newsletters/subscribe/status?listing_id=N&email=xxx
 *
 * Returns subscription status and subscriber count for a listing.
 * No auth required (used to show subscriber count publicly).
 *
 * @component API Route
 * @tier SIMPLE
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { NewsletterService } from '@core/services/NewsletterService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;
  const { searchParams } = new URL(request.url);
  const listingId = parseInt(searchParams.get('listing_id') || '0', 10);
  const email = searchParams.get('email');

  if (!listingId) {
    return createErrorResponse(
      BizError.badRequest('listing_id is required'),
      context.requestId
    );
  }

  const db = getDatabaseService();
  const newsletterService = new NewsletterService(db);

  const subscriberCount = await newsletterService.getSubscriberCount(listingId);

  let status: string | null = null;
  if (email) {
    status = await newsletterService.getSubscriptionStatus(listingId, email);
  }

  return createSuccessResponse({
    status,
    subscriberCount,
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: false,
});
