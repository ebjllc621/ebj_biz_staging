/**
 * Group Bid Comparison API Route
 * GET /api/users/connections/groups/[groupId]/quote-pool/bids?quoteId=X
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
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * Extract groupId from URL path
 * Path: /api/users/connections/groups/[groupId]/quote-pool/bids
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
 * GET /api/users/connections/groups/[groupId]/quote-pool/bids
 * Get bid comparison for all group members on a specific quote
 *
 * @authenticated Required
 * @query quoteId - The quote to compare bids for
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const url = new URL(context.request.url);
  const quoteIdStr = url.searchParams.get('quoteId');

  if (!quoteIdStr) {
    throw BizError.badRequest('quoteId query parameter is required');
  }

  const quoteId = parseInt(quoteIdStr, 10);
  if (isNaN(quoteId)) {
    throw BizError.badRequest('Invalid quoteId');
  }

  const comparison = await service.getGroupBidComparison(groupId, quoteId, userId);

  return createSuccessResponse({ comparison }, context.requestId);
}, {
  requireAuth: true
});
