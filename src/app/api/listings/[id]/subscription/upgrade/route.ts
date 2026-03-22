/**
 * POST /api/listings/[id]/subscription/upgrade - Upgrade Subscription Plan
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use SubscriptionService.upgradeSubscription()
 * - MUST authorize: user owns listing
 * - MUST validate new plan exists
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { SubscriptionService } from '@core/services/SubscriptionService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * POST handler - Upgrade listing subscription to new plan
 */
export const POST = apiHandler(async (context: ApiContext) => {
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

  if (!isOwner) {
    throw BizError.forbidden('You do not have permission to upgrade this subscription');
  }

  // Parse request body
  const body = await context.request.json();

  if (!body.newPlanId) {
    throw BizError.badRequest('Missing required field: newPlanId');
  }

  const newPlanId = parseInt(body.newPlanId, 10);

  if (isNaN(newPlanId)) {
    throw BizError.badRequest('Invalid plan ID');
  }

  // Verify new plan exists
  const planResult = await db.query<{ id: number }>(
    'SELECT id FROM subscription_plans WHERE id = ?',
    [newPlanId]
  );

  if (planResult.rows.length === 0) {
    throw BizError.notFound('Subscription plan not found');
  }

  // Upgrade subscription
  const updatedSubscription = await subscriptionService.upgradeSubscription(listingId, newPlanId);

  return createSuccessResponse(updatedSubscription, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
