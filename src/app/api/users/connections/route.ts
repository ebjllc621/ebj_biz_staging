/**
 * User Connections API Route
 * GET /api/users/connections - Get current user's connections
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/[username]/profile/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections
 * Get all connections for the authenticated user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Get connections
  const connections = await service.getUserConnections(userId);

  // Get connection stats
  const stats = await service.getConnectionStats(userId);

  return createSuccessResponse({
    connections,
    total: connections.length,
    stats
  }, context.requestId);
}, {
  requireAuth: true
});
