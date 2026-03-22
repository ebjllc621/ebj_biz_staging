/**
 * Group Message Detail API Route
 * GET /api/users/connections/groups/[groupId]/messages/[messageId] - Get single message
 * DELETE /api/users/connections/groups/[groupId]/messages/[messageId] - Delete message
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
 * GET /api/users/connections/groups/[groupId]/messages/[messageId]
 * Get a single group message
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { messageId } = extractIds(context);

  const message = await service.getGroupMessage(messageId, userId);

  if (!message) {
    throw BizError.notFound('Message not found');
  }

  return createSuccessResponse({
    message
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/groups/[groupId]/messages/[messageId]
 * Delete (soft delete) a group message
 *
 * @authenticated Required
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const { messageId } = extractIds(context);

  await service.deleteGroupMessage(messageId, userId);

  return createSuccessResponse({
    success: true,
    message: 'Message deleted successfully'
  }, context.requestId);
}, {
  requireAuth: true
}));
