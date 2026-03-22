/**
 * BizWire User Threads Route
 * GET /api/users/bizwire - Get BizWire threads for the authenticated user
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
 * GET /api/users/bizwire
 * Get BizWire thread summaries for the authenticated user (user's sent inquiries view)
 * Query params: page, limit, search
 *
 * @authenticated Own threads only — userId from session
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = context.userId;
  if (!userId) throw BizError.unauthorized('Authentication required');
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) throw BizError.badRequest('Invalid user ID');

  const reqUrl = new URL(context.request.url);
  const page = parseInt(reqUrl.searchParams.get('page') || '1');
  const limit = parseInt(reqUrl.searchParams.get('limit') || '20');
  const search = reqUrl.searchParams.get('search') || undefined;
  const status = reqUrl.searchParams.get('status') || undefined;

  const service = getListingMessageService();
  const result = await service.getUserBizWireThreads(
    ownerId,
    { search, status },
    { page, limit }
  );

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
