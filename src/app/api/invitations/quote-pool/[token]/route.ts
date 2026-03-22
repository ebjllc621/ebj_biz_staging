/**
 * Accept Quote Pool Invitation API Route
 * POST /api/invitations/quote-pool/[token] - Accept an invitation by token
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required (user must be registered to accept)
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
 * Extract token from URL path
 * Path: /api/invitations/quote-pool/[token]
 */
function extractToken(context: ApiContext): string {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const token = pathParts[pathParts.length - 1] || '';

  if (!token) {
    throw BizError.badRequest('Invalid token');
  }

  return token;
}

/**
 * POST /api/invitations/quote-pool/[token]
 * Accept a quote pool invitation
 * User must be authenticated (registered) to accept
 *
 * @authenticated Required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const token = extractToken(context);

  await service.acceptQuotePoolInvitation(token, userId);

  return createSuccessResponse({
    success: true,
    message: 'Invitation accepted. You have joined the quote pool group.'
  }, context.requestId);
}, {
  requireAuth: true
}));
