/**
 * Subscription Downgrade API Route
 * POST /api/subscriptions/[id]/downgrade - Downgrade subscription
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Grandfathering protection at service layer
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getSubscriptionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/subscriptions/[id]/downgrade
 * Downgrade subscription to a lower tier
 * Note: [id] is listing ID (not subscription ID) as per service signature
 * Body:
 *   - newPlanId: New subscription plan ID (required)
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'downgrade')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
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
  if (!requestBody.newPlanId || typeof requestBody.newPlanId !== 'number') {
    throw BizError.validation('newPlanId', requestBody.newPlanId, 'New plan ID is required and must be a number');
  }

  // Downgrade subscription (downgradeSubscription takes listingId and newPlanId)
  
  const service = getSubscriptionService();
  const subscription = await service.downgradeSubscription(listingId, requestBody.newPlanId);

  return createSuccessResponse({ subscription }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
