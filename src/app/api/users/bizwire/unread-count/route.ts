/**
 * BizWire Unread Count Route
 * GET /api/users/bizwire/unread-count - Get unread BizWire message count for the user badge
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - User ID ALWAYS from context.userId (session) — never from query params
 * - DatabaseService boundary: Service layer handles all DB operations
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/users/bizwire/unread-count
 * Get unread BizWire message count for the authenticated user (for badge display)
 *
 * @authenticated Own count only — userId from session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = context.userId;
  if (!userId) throw BizError.unauthorized('Authentication required');
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) throw BizError.badRequest('Invalid user ID');

  const service = getListingMessageService();
  const count = await service.getUserUnreadCount(ownerId);

  return createSuccessResponse({ count }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
