/**
 * BizWire Thread Archive Route
 * PUT /api/listings/[id]/bizwire/[threadId]/archive - Archive a BizWire thread (listing owner only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf wrapper: MANDATORY for PUT
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Ownership check: Listing owner only can archive
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * PUT /api/listings/[id]/bizwire/[threadId]/archive
 * Archive all messages in a BizWire thread (listing owner only)
 *
 * @authenticated Listing owner only
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');

  // Extract listing ID
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
  }

  // Extract thread ID (string — do NOT parseInt)
  const threadIdSegment = segments[segments.indexOf('bizwire') + 1];
  if (!threadIdSegment) {
    throw BizError.badRequest('Thread ID is required');
  }
  const threadId = decodeURIComponent(threadIdSegment);

  const userId = context.userId;
  if (!userId) throw BizError.unauthorized('Authentication required');
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) throw BizError.badRequest('Invalid user ID');

  // Verify listing ownership (only listing owner can archive)
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  if (!listing || listing.user_id !== ownerId) {
    throw BizError.forbidden('You do not have permission to access this resource');
  }

  // Archive the thread
  const service = getListingMessageService();
  await service.archiveThread(threadId);

  return createSuccessResponse({ archived: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PUT']
}));
