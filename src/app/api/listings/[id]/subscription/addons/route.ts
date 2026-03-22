/**
 * GET/POST /api/listings/[id]/subscription/addons - Manage Subscription Add-ons
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use SubscriptionService for add-on management
 * - MUST authorize: user owns listing
 * - GET returns active add-ons, POST adds new add-on
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { SubscriptionService } from '@core/services/SubscriptionService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch active add-ons for listing subscription
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
    throw BizError.forbidden('You do not have permission to view these add-ons');
  }

  // Get subscription
  const subscription = await subscriptionService.getSubscription(listingId);

  if (!subscription) {
    throw BizError.notFound('No active subscription found for this listing');
  }

  // Get active add-ons
  const addons = await subscriptionService.getSubscriptionAddons(subscription.id);

  return createSuccessResponse(addons, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

/**
 * POST handler - Add new add-on to subscription
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
    throw BizError.forbidden('You do not have permission to add add-ons to this subscription');
  }

  // Parse request body
  const body = await context.request.json();

  if (!body.addonId) {
    throw BizError.badRequest('Missing required field: addonId');
  }

  const addonId = parseInt(body.addonId, 10);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid add-on ID');
  }

  // Get subscription
  const subscription = await subscriptionService.getSubscription(listingId);

  if (!subscription) {
    throw BizError.notFound('No active subscription found for this listing');
  }

  // Verify add-on exists
  const addonResult = await db.query<{ id: number }>(
    'SELECT id FROM addon_suites WHERE id = ?',
    [addonId]
  );

  if (addonResult.rows.length === 0) {
    throw BizError.notFound('Add-on suite not found');
  }

  // Add add-on to subscription
  const addedAddon = await subscriptionService.addAddonToSubscription(subscription.id, addonId);

  return createSuccessResponse(addedAddon, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
