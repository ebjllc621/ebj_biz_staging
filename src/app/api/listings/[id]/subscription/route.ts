/**
 * GET /api/listings/[id]/subscription - Listing Subscription API
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use SubscriptionService for business logic
 * - MUST authorize: user owns listing or is admin
 * - Returns subscription details with plan info and active add-ons
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { SubscriptionService } from '@core/services/SubscriptionService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch subscription details for listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const subscriptionService = new SubscriptionService(db);

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  // Verify ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  // Check if admin
  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ?',
    [parseInt(context.userId, 10)]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to view this subscription');
  }

  // Get subscription details
  const subscription = await subscriptionService.getSubscription(listingId);

  // Get active plans (for upgrade comparison)
  const availablePlans = await subscriptionService.getActivePlans();

  // Get all add-ons (for add-on management)
  const availableAddons = await subscriptionService.getAllAddons();

  // Get active add-ons for this subscription
  let activeAddons: Awaited<ReturnType<typeof subscriptionService.getSubscriptionAddons>> = [];
  if (subscription) {
    activeAddons = await subscriptionService.getSubscriptionAddons(subscription.id);
  }

  return createSuccessResponse({
    subscription,
    availablePlans,
    availableAddons,
    activeAddons
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
