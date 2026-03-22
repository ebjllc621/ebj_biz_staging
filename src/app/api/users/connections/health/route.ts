/**
 * Connection Health API Route
 * GET /api/users/connections/health - Get connection health metrics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionAnalyticsService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/health
 * Get connection health metrics for the authenticated user
 *
 * Returns:
 * - healthScore (0-100)
 * - totalConnections
 * - activeConnections
 * - staleConnections
 * - averageInteractionFrequency
 * - recommendations[]
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionAnalyticsService();
  const userId = parseInt(context.userId!, 10);

  const health = await service.getConnectionHealth(userId);

  return createSuccessResponse({ health }, context.requestId);
}, {
  requireAuth: true
});
