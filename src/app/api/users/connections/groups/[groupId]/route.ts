/**
 * Connection Group Detail API Route
 * GET /api/users/connections/groups/[groupId] - Get group details
 * PATCH /api/users/connections/groups/[groupId] - Update group
 * DELETE /api/users/connections/groups/[groupId] - Delete (archive) group
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
 * @reference src/app/api/users/connections/[connectionId]/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { ConnectionGroupNotFoundError } from '@features/connections/services/ConnectionGroupService';
import { BizError } from '@core/errors/BizError';
import type { UpdateGroupInput } from '@features/connections/types/groups';

/**
 * Extract groupId from URL path
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Path: /api/users/connections/groups/[groupId]
  const groupIdStr = pathParts[pathParts.length - 1] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * GET /api/users/connections/groups/[groupId]
 * Get details for a specific group
 *
 * @authenticated Required
 * @param groupId - Group ID
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const group = await service.getGroup(groupId, userId);

  if (!group) {
    throw new ConnectionGroupNotFoundError();
  }

  return createSuccessResponse({
    group,
    currentUserId: userId
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * PATCH /api/users/connections/groups/[groupId]
 * Update a connection group
 *
 * @authenticated Required
 * @param groupId - Group ID
 * @body UpdateGroupInput - Fields to update
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const input = await context.request.json() as UpdateGroupInput;

  // Validate name length if provided
  if (input.name !== undefined && input.name.length > 100) {
    throw BizError.badRequest('Group name must be 100 characters or less');
  }

  const group = await service.updateGroup(groupId, userId, input);

  return createSuccessResponse({
    group
  }, context.requestId);
}, {
  requireAuth: true
}));

/**
 * DELETE /api/users/connections/groups/[groupId]
 * Delete (archive) a connection group
 *
 * @authenticated Required
 * @param groupId - Group ID
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  await service.deleteGroup(groupId, userId);

  return createSuccessResponse({
    success: true,
    message: 'Group archived successfully'
  }, context.requestId);
}, {
  requireAuth: true
}));
