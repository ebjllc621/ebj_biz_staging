/**
 * Group Member Suggestion Review API Route
 * PATCH /api/users/connections/groups/[groupId]/suggestions/[suggestionId] - Approve/deny
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { ReviewSuggestionInput } from '@features/connections/types/group-actions';

function extractSuggestionId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const suggestionId = parseInt(pathParts[pathParts.length - 1] || '', 10);
  if (isNaN(suggestionId)) throw BizError.badRequest('Invalid suggestion ID');
  return suggestionId;
}

/**
 * PATCH - Review (approve/deny) a member suggestion (owner-only)
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const suggestionId = extractSuggestionId(context);

  const input = await context.request.json() as ReviewSuggestionInput;

  if (!input.status || !['approved', 'denied'].includes(input.status)) {
    throw BizError.badRequest('status must be "approved" or "denied"');
  }

  const suggestion = await service.reviewSuggestion(suggestionId, userId, input);

  return createSuccessResponse({ suggestion }, context.requestId);
}, {
  requireAuth: true
}));
