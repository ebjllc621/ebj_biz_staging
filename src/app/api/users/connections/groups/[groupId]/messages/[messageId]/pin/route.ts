/**
 * Group Message Pin API Route
 * PATCH /api/users/connections/groups/[groupId]/messages/[messageId]/pin - Toggle pin status
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
 * Extract IDs from URL path
 */
function extractIds(context: ApiContext): { groupId: number; messageId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  const messageIdIndex = pathParts.indexOf('messages') + 1;
  const messageIdStr = pathParts[messageIdIndex] || '';
  const messageId = parseInt(messageIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID');
  }

  return { groupId, messageId };
}

/**
 * PATCH /api/users/connections/groups/[groupId]/messages/[messageId]/pin
 * Pin or unpin a group message
 *
 * @authenticated Required
 * @body { pinned: boolean }
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { messageId } = extractIds(context);

  const body = await context.request.json() as { pinned: boolean };

  if (typeof body.pinned !== 'boolean') {
    throw BizError.badRequest('pinned must be a boolean');
  }

  await service.toggleMessagePin(messageId, userId, body.pinned);

  return createSuccessResponse({
    success: true,
    message: body.pinned ? 'Message pinned' : 'Message unpinned'
  }, context.requestId);
}, {
  requireAuth: true
}));
