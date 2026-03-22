/**
 * Subscription Add-ons API Routes
 * GET /api/subscriptions/[id]/addons - Get subscription add-ons
 * POST /api/subscriptions/[id]/addons - Add subscription add-on
 * DELETE /api/subscriptions/[id]/addons - Remove subscription add-on
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getSubscriptionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * GET /api/subscriptions/[id]/addons
 * Get add-ons for subscription
 *
 * @authenticated User authentication required (listing owner or admin)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  // Extract subscription ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'addons')
  if (!id) {
    throw BizError.badRequest('Subscription ID is required');
  }
  const subscriptionId = parseInt(id);
  if (isNaN(subscriptionId)) {
    throw BizError.badRequest('Invalid subscription ID', { id });
  }

  
  const service = getSubscriptionService();
  const addons = await service.getSubscriptionAddons(subscriptionId);

  return createSuccessResponse({ addons }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
});

/**
 * POST /api/subscriptions/[id]/addons
 * Add add-on to subscription
 * Body:
 *   - addon_suite_id: Add-on suite ID (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract subscription ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'addons')
  if (!id) {
    throw BizError.badRequest('Subscription ID is required');
  }
  const subscriptionId = parseInt(id);
  if (isNaN(subscriptionId)) {
    throw BizError.badRequest('Invalid subscription ID', { id });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.addon_suite_id || typeof requestBody.addon_suite_id !== 'number') {
    throw BizError.validation('addon_suite_id', requestBody.addon_suite_id, 'Add-on suite ID is required and must be a number');
  }

  // Add addon (addAddonToSubscription returns void)
  
  const service = getSubscriptionService();
  await service.addAddonToSubscription(subscriptionId, requestBody.addon_suite_id);

  return createSuccessResponse({ message: 'Add-on added successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));

/**
 * DELETE /api/subscriptions/[id]/addons
 * Remove add-on from subscription
 * Query parameters:
 *   - addonId: Add-on ID (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract subscription ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'addons')
  if (!id) {
    throw BizError.badRequest('Subscription ID is required');
  }
  const subscriptionId = parseInt(id);
  if (isNaN(subscriptionId)) {
    throw BizError.badRequest('Invalid subscription ID', { id });
  }

  const { searchParams } = new URL(context.request.url);
  const addonIdParam = searchParams.get('addonId');

  if (!addonIdParam) {
    throw BizError.badRequest('addonId query parameter is required');
  }

  const addonId = parseInt(addonIdParam);
  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addonId parameter', { addonId: addonIdParam });
  }

  // Remove addon (removeAddonFromSubscription returns void)
  
  const service = getSubscriptionService();
  await service.removeAddonFromSubscription(subscriptionId, addonId);

  return createSuccessResponse({ message: 'Add-on removed successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST', 'DELETE']
}));
