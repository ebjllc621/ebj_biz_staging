/**
 * Listing Message Reply API Route
 * POST /api/listings/[id]/messages/[messageId]/reply - Reply to a message
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authorization: Verify listing ownership
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 9 Brain Plan - Communication/Reputation Pages
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/listings/[id]/messages/[messageId]/reply
 * Reply to a message (from listing owner to customer)
 * Body:
 *   - content: Reply content (required)
 *
 * @authenticated User must own the listing
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const listingIdSegment = segments[segments.indexOf('listings') + 1];
  const messageIdSegment = segments[segments.length - 2]; // Second to last (before 'reply')

  const listingId = parseInt(listingIdSegment || '');
  const messageId = parseInt(messageIdSegment || '');

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: listingIdSegment });
  }
  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID', { id: messageIdSegment });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.content || typeof requestBody.content !== 'string' || requestBody.content.trim() === '') {
    throw BizError.validation('content', requestBody.content, 'Reply content is required and must be a non-empty string');
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Verify listing ownership
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);

  if (!listing || listing.user_id !== ownerId) {
    throw BizError.forbidden('You do not have permission to reply to messages for this listing');
  }

  // Create reply
  const service = getListingMessageService();
  const replyId = await service.replyToMessage(messageId, listingId, ownerId, requestBody.content.trim());

  // Get created reply
  const reply = await service.getMessageById(replyId);

  return createSuccessResponse({ reply }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
