/**
 * Connection Rate Limits API Route
 * GET /api/users/connections/rate-limits - Get current rate limit status
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/CONNECT_P2_MASTER_INDEX_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 1
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/rate-limits
 * Get current rate limit status for the authenticated user
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const rateLimitStatus = await service.checkRateLimits(userId);

  return createSuccessResponse(rateLimitStatus, context.requestId);
}, {
  requireAuth: true
});
