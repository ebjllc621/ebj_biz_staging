/**
 * Quote Pool Invitation Detail API Route
 * DELETE /api/users/connections/groups/[groupId]/quote-pool/invitations/[invitationId]
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

/**
 * Extract invitationId from URL path
 * Path: /api/users/connections/groups/[groupId]/quote-pool/invitations/[invitationId]
 */
function extractInvitationId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // invitationId is the last segment
  const invitationIdStr = pathParts[pathParts.length - 1] || '';
  const invitationId = parseInt(invitationIdStr, 10);

  if (isNaN(invitationId)) {
    throw BizError.badRequest('Invalid invitation ID');
  }

  return invitationId;
}

/**
 * DELETE /api/users/connections/groups/[groupId]/quote-pool/invitations/[invitationId]
 * Cancel a pending quote pool invitation
 *
 * @authenticated Required
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const invitationId = extractInvitationId(context);

  await service.cancelQuotePoolInvitation(invitationId, userId);

  return createSuccessResponse({
    success: true,
    message: 'Invitation cancelled'
  }, context.requestId);
}, {
  requireAuth: true
}));
