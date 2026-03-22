/**
 * Group Member Suggestions API Route
 * POST /api/users/connections/groups/[groupId]/suggestions - Suggest a member
 * GET /api/users/connections/groups/[groupId]/suggestions - List pending suggestions (owner)
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { SuggestMemberInput } from '@features/connections/types/group-actions';

function extractGroupId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupId = parseInt(pathParts[groupIdIndex] || '', 10);
  if (isNaN(groupId)) throw BizError.badRequest('Invalid group ID');
  return groupId;
}

/**
 * POST - Suggest a member to be added (any member can do this)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const input = await context.request.json() as SuggestMemberInput;

  if (!input.suggestedUserId) {
    throw BizError.badRequest('suggestedUserId is required');
  }

  const suggestion = await service.suggestMember(groupId, userId, input);

  return createSuccessResponse({ suggestion }, context.requestId);
}, {
  requireAuth: true
}));

/**
 * GET - List pending suggestions (owner-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const suggestions = await service.getGroupSuggestions(groupId, userId);

  return createSuccessResponse({ suggestions }, context.requestId);
}, {
  requireAuth: true
});
