/**
 * Send Quote to Group API Route
 * POST /api/users/connections/groups/[groupId]/quote-pool/send - Send a quote to group members
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
import type { SendQuoteToGroupInput } from '@features/connections/types/groups';

/**
 * Extract groupId from URL path
 * Path: /api/users/connections/groups/[groupId]/quote-pool/send
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
 * POST /api/users/connections/groups/[groupId]/quote-pool/send
 * Send a quote to all group members' listings
 *
 * @authenticated Required
 * @body { quoteId: number; message?: string }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as Omit<SendQuoteToGroupInput, 'groupId'>;

  if (!body.quoteId || typeof body.quoteId !== 'number') {
    throw BizError.badRequest('quoteId is required and must be a number');
  }

  const input: SendQuoteToGroupInput = {
    quoteId: body.quoteId,
    groupId,
    message: body.message
  };

  await service.sendQuoteToGroup(userId, input);

  return createSuccessResponse({
    success: true,
    message: 'Quote sent to all group members'
  }, context.requestId);
}, {
  requireAuth: true
}));
