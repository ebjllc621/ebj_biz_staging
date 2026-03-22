/**
 * Quote Pool Settings API Route
 * GET /api/users/connections/groups/[groupId]/quote-pool - Get quote pool settings
 * PATCH /api/users/connections/groups/[groupId]/quote-pool - Enable/disable quote pool
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @phase Phase 3B - Quote Pool Integration
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { UpdateQuotePoolInput } from '@features/connections/types/groups';

/**
 * Extract groupId from URL path
 * Path: /api/users/connections/groups/[groupId]/quote-pool
 */
function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupsIndex = pathParts.indexOf('groups');
  const groupIdStr = pathParts[groupsIndex + 1] || '';
  const groupId = parseInt(groupIdStr, 10);

  if (isNaN(groupId)) {
    throw BizError.badRequest('Invalid group ID');
  }

  return groupId;
}

/**
 * GET /api/users/connections/groups/[groupId]/quote-pool
 * Get quote pool settings for a group
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const group = await service.getGroup(groupId, userId);

  if (!group) {
    throw BizError.notFound('Group not found');
  }

  return createSuccessResponse({
    groupId: group.id,
    groupName: group.name,
    isQuotePool: group.isQuotePool,
    quotePoolCategory: group.quotePoolCategory
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * PATCH /api/users/connections/groups/[groupId]/quote-pool
 * Enable or disable quote pool on a group
 *
 * @authenticated Required
 * @body UpdateQuotePoolInput
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as UpdateQuotePoolInput;

  if (typeof body.isQuotePool !== 'boolean') {
    throw BizError.badRequest('isQuotePool must be a boolean');
  }

  let group;
  if (body.isQuotePool) {
    group = await service.enableQuotePool(groupId, userId, body.quotePoolCategory);
  } else {
    group = await service.disableQuotePool(groupId, userId);
  }

  return createSuccessResponse({ group }, context.requestId);
}, {
  requireAuth: true
}));
