/**
 * Quote Pools List API Route
 * GET /api/users/connections/groups/quote-pools - Get all user's quote pool groups
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @phase Phase 3B - Quote Pool Integration
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/groups/quote-pools
 * Get all quote pool groups for the current user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const quotePools = await service.getQuotePools(userId);

  return createSuccessResponse({
    items: quotePools,
    total: quotePools.length
  }, context.requestId);
}, {
  requireAuth: true
});
