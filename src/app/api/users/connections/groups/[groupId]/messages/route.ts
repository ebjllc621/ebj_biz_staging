/**
 * Group Messages API Route
 * GET /api/users/connections/groups/[groupId]/messages - Get group messages
 * POST /api/users/connections/groups/[groupId]/messages - Send message to group
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { SendGroupMessageInput } from '@features/connections/types/group-actions';

/**
 * Extract groupId from URL path
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Path: /api/users/connections/groups/[groupId]/messages
  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupIdStr = pathParts[groupIdIndex] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * GET /api/users/connections/groups/[groupId]/messages
 * Get messages for a group
 *
 * @authenticated Required
 * @query limit - Max messages to return (default 50)
 * @query before - Get messages before this message ID (for pagination)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const before = url.searchParams.get('before')
    ? parseInt(url.searchParams.get('before')!, 10)
    : undefined;

  const { messages, hasMore } = await service.getGroupMessages(groupId, userId, { limit, before });

  return createSuccessResponse({
    messages,
    pagination: {
      hasMore,
      nextCursor: hasMore && messages.length > 0 ? messages[messages.length - 1]!.id : null
    }
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups/[groupId]/messages
 * Send a message to all group members
 *
 * @authenticated Required
 * @param groupId - Group ID
 * @body SendGroupMessageInput - Message details
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as Omit<SendGroupMessageInput, 'groupId'>;

  // Validate content
  if (!body.content || body.content.trim().length === 0) {
    throw BizError.badRequest('Message content is required');
  }

  if (body.content.length > 5000) {
    throw BizError.badRequest('Message content must be 5000 characters or less');
  }

  const input: SendGroupMessageInput = {
    groupId,
    ...body
  };

  const result = await service.sendGroupMessage(userId, input);

  return createSuccessResponse({
    message: result.message,
    deliveredTo: result.deliveredTo
  }, context.requestId);
}, {
  requireAuth: true
}));
