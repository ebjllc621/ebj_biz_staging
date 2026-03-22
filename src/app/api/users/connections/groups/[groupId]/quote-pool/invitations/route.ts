/**
 * Quote Pool Invitations API Route
 * GET /api/users/connections/groups/[groupId]/quote-pool/invitations - List pending invitations
 * POST /api/users/connections/groups/[groupId]/quote-pool/invitations - Send email invitations
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
import type { InviteToQuotePoolInput } from '@features/connections/types/groups';

/**
 * Extract groupId from URL path
 * Path: /api/users/connections/groups/[groupId]/quote-pool/invitations
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
 * GET /api/users/connections/groups/[groupId]/quote-pool/invitations
 * List pending quote pool invitations for a group
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const invitations = await service.getQuotePoolInvitations(groupId, userId);

  return createSuccessResponse({
    invitations,
    total: invitations.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups/[groupId]/quote-pool/invitations
 * Send email invitations to join a quote pool group
 *
 * @authenticated Required
 * @body { emails: string[]; message?: string; quoteId?: number }
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const groupId = extractGroupId(context);

  const body = await context.request.json() as Omit<InviteToQuotePoolInput, 'groupId'>;

  if (!body.emails || !Array.isArray(body.emails) || body.emails.length === 0) {
    throw BizError.badRequest('emails array is required and must not be empty');
  }

  if (body.emails.length > 20) {
    throw BizError.badRequest('Cannot invite more than 20 people at once');
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of body.emails) {
    if (!emailRegex.test(email.trim())) {
      throw BizError.badRequest(`Invalid email address: ${email}`);
    }
  }

  const input: InviteToQuotePoolInput = {
    groupId,
    emails: body.emails,
    message: body.message,
    quoteId: body.quoteId
  };

  const invitations = await service.inviteToQuotePool(userId, input);

  return createSuccessResponse({
    invitations,
    sent: invitations.length
  }, context.requestId);
}, {
  requireAuth: true
}));
