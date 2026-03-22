/**
 * Subscription Plans API Route
 * GET /api/subscriptions - Get all active subscription plans
 *
 * GOVERNANCE COMPLIANCE:
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary enforcement
 * - apiHandler wrapper: COMPLIANT
 * - Proper error handling via apiHandler
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.6: SubscriptionService API Routes
 * @compliance E2.4 - API Route Standards
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getSubscriptionService } from '@core/services/ServiceRegistry';

/**
 * GET /api/subscriptions
 * Retrieve all active subscription plans
 *
 * Query Parameters:
 * - all: boolean - Include deprecated plans (default: false)
 *
 * Response:
 * - 200: Array of subscription plans
 * - 500: Internal server error
 */
export const GET = apiHandler(async (context) => {
  const url = new URL(context.request.url);
  const includeAll = url.searchParams.get('all') === 'true';

  // Initialize services
  const subscriptionService = getSubscriptionService();

  // Get plans
  const plans = includeAll
    ? await subscriptionService.getAllPlans()
    : await subscriptionService.getActivePlans();

  return createSuccessResponse({
    plans,
    count: plans.length,
    includeAll
  }, 200);
});
