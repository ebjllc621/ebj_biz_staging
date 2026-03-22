/**
 * Listing Messages API Route
 * GET /api/listings/[id]/messages - Get messages for listing
 * POST /api/listings/[id]/messages - Create new message to listing
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Data isolation: listing_id context (not user_id)
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 9 Brain Plan - Communication/Reputation Pages
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { MessageType } from '@core/services/ListingMessageService';

/**
 * GET /api/listings/[id]/messages
 * Get messages for a listing
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20)
 *   - status: Filter by status (new, read, replied, archived)
 *   - is_read: Filter by read status (true/false)
 *
 * @authenticated User must own the listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
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
    throw BizError.forbidden('You do not have permission to access these messages');
  }

  // Get query params
  const page = parseInt(reqUrl.searchParams.get('page') || '1');
  const limit = parseInt(reqUrl.searchParams.get('limit') || '20');
  const status = reqUrl.searchParams.get('status') || undefined;
  const isReadParam = reqUrl.searchParams.get('is_read');
  const is_read = isReadParam ? isReadParam === 'true' : undefined;

  // Get messages
  const service = getListingMessageService();
  const result = await service.getMessagesByListing(
    listingId,
    { status: status as any, is_read },
    { page, limit }
  );

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * POST /api/listings/[id]/messages
 * Create a new message to listing (user inquiry)
 * Body:
 *   - subject: Message subject (optional)
 *   - content: Message content (required)
 *   - message_type: Message type (optional, default: inquiry)
 *
 * @authenticated User authentication required
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
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
    throw BizError.validation('content', requestBody.content, 'Content is required and must be a non-empty string');
  }

  // Validate optional fields
  if (requestBody.subject !== undefined && (typeof requestBody.subject !== 'string' || requestBody.subject.trim() === '')) {
    throw BizError.validation('subject', requestBody.subject, 'Subject must be a non-empty string if provided');
  }

  const validMessageTypes: MessageType[] = ['inquiry', 'quote_request', 'appointment', 'feedback', 'other'];
  if (requestBody.message_type !== undefined) {
    if (typeof requestBody.message_type !== 'string' || !validMessageTypes.includes(requestBody.message_type as MessageType)) {
      throw BizError.validation('message_type', requestBody.message_type, `Message type must be one of: ${validMessageTypes.join(', ')}`);
    }
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const senderId = parseInt(userId);
  if (isNaN(senderId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Verify listing exists
  const listingService = getListingService();
  await listingService.getById(listingId); // Will throw if not found

  // Create message
  const service = getListingMessageService();
  const messageId = await service.createMessage(listingId, senderId, {
    subject: requestBody.subject as string | undefined,
    content: requestBody.content as string,
    message_type: requestBody.message_type as MessageType | undefined
  });

  // Get created message
  const message = await service.getMessageById(messageId);

  return createSuccessResponse({ message }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
