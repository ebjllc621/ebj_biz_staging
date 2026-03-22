/**
 * Group Message Read Status API Route
 * POST /api/users/connections/groups/[groupId]/messages/read - Mark messages as read
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * Extract groupId from URL path
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * POST /api/users/connections/groups/[groupId]/messages/read
 * Mark group messages as read up to a specific message
 *
 * @authenticated Required
 * @body { lastReadMessageId: number }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as { lastReadMessageId: number };

  if (!body.lastReadMessageId || isNaN(body.lastReadMessageId)) {
    throw BizError.badRequest('lastReadMessageId is required');
  }

  await service.markGroupMessagesRead(groupId, userId, body.lastReadMessageId);

  return createSuccessResponse({
    success: true,
    message: 'Messages marked as read'
  }, context.requestId);
}, {
  requireAuth: true
}));
