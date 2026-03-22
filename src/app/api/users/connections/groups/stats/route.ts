/**
 * Group Stats API Route
 * GET /api/users/connections/groups/stats - Get group statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/connections/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/groups/stats
 * Get statistics for the authenticated user's connection groups
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const stats = await service.getGroupStats(userId);

  return createSuccessResponse({
    stats
  }, context.requestId);
}, {
  requireAuth: true
});
