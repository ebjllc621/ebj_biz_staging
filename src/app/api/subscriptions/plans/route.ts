/**
 * Subscription Plans API Route
 * GET /api/subscriptions/plans - Get available subscription plans
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

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans (non-deprecated)
 * Query parameters:
 *   - includeAddons: Include available add-on suites (true/false, optional, default: false)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const { searchParams } = new URL(context.request.url);

  const includeAddons = searchParams.get('includeAddons') === 'true';

  
  const service = getSubscriptionService();
  const plans = await service.getActivePlans();

  let addons = undefined;
  if (includeAddons) {
    addons = await service.getAllAddons();
  }

  return createSuccessResponse({ plans, addons }, context.requestId);
}, {
  allowedMethods: ['GET']
});
