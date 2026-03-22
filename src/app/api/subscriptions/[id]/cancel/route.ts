/**
 * Subscription Cancellation API Route
 * POST /api/subscriptions/[id]/cancel - Cancel subscription
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
 * POST /api/subscriptions/[id]/cancel
 * Cancel subscription (sets status to 'cancelled')
 * Note: [id] is listing ID (not subscription ID) as per service signature
 * Body: None required
 *
 * @authenticated User authentication required (listing owner or admin)
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract listing ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'cancel')
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Cancel subscription (cancelSubscription takes listingId, returns void)
  
  const service = getSubscriptionService();
  await service.cancelSubscription(listingId);

  return createSuccessResponse({ message: 'Subscription cancelled successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
