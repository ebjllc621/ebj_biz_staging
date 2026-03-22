/**
 * Group Message Threads API Route
 * GET /api/users/connections/groups/message-threads - Get user's group message threads
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

/**
 * GET /api/users/connections/groups/message-threads
 * Get all groups with messages for the current user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);

  const threads = await service.getUserGroupMessageThreads(userId);

  return createSuccessResponse({
    threads
  }, context.requestId);
}, {
  requireAuth: true
});
