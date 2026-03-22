/**
 * Listing Message Detail API Route
 * GET /api/listings/[id]/messages/[messageId] - Get specific message
 * PUT /api/listings/[id]/messages/[messageId] - Update message status/read state
 * DELETE /api/listings/[id]/messages/[messageId] - Delete message
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
import { getListingMessageService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { MessageStatus } from '@core/services/ListingMessageService';

/**
 * GET /api/listings/[id]/messages/[messageId]
 * Get specific message with authorization check
 *
 * @authenticated User must own the listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const messageIdSegment = segments[segments.length - 1];
  const messageId = parseInt(messageIdSegment || '');
  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID', { id: messageIdSegment });
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
  const service = getListingMessageService();
  const canAccess = await service.verifyListingOwnership(messageId, ownerId);

  if (!canAccess) {
    throw BizError.forbidden('You do not have permission to access this message');
  }

  // Get message
  const message = await service.getMessageById(messageId);

  return createSuccessResponse({ message }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * PUT /api/listings/[id]/messages/[messageId]
 * Update message status or read state
 * Body:
 *   - status: Message status (optional): new, read, replied, archived
 *   - is_read: Read status (optional): true/false
 *
 * @authenticated User must own the listing
 */
export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const messageIdSegment = segments[segments.length - 1];
  const messageId = parseInt(messageIdSegment || '');
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

  // Validate at least one field is provided
  if (requestBody.status === undefined && requestBody.is_read === undefined) {
    throw BizError.validation('body', requestBody, 'At least one of status or is_read must be provided');
  }

  // Validate status if provided
  const validStatuses: MessageStatus[] = ['new', 'read', 'replied', 'archived'];
  if (requestBody.status !== undefined) {
    if (typeof requestBody.status !== 'string' || !validStatuses.includes(requestBody.status as MessageStatus)) {
      throw BizError.validation('status', requestBody.status, `Status must be one of: ${validStatuses.join(', ')}`);
    }
  }

  // Validate is_read if provided
  if (requestBody.is_read !== undefined && typeof requestBody.is_read !== 'boolean') {
    throw BizError.validation('is_read', requestBody.is_read, 'is_read must be a boolean');
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
  const service = getListingMessageService();
  const canAccess = await service.verifyListingOwnership(messageId, ownerId);

  if (!canAccess) {
    throw BizError.forbidden('You do not have permission to update this message');
  }

  // Update message
  await service.updateMessage(messageId, {
    status: requestBody.status as MessageStatus | undefined,
    is_read: requestBody.is_read as boolean | undefined
  });

  // Get updated message
  const message = await service.getMessageById(messageId);

  return createSuccessResponse({ message }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PUT']
}));

/**
 * DELETE /api/listings/[id]/messages/[messageId]
 * Delete message (hard delete)
 *
 * @authenticated User must own the listing
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const messageIdSegment = segments[segments.length - 1];
  const messageId = parseInt(messageIdSegment || '');
  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID', { id: messageIdSegment });
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
  const service = getListingMessageService();
  const canAccess = await service.verifyListingOwnership(messageId, ownerId);

  if (!canAccess) {
    throw BizError.forbidden('You do not have permission to delete this message');
  }

  // Delete message
  await service.deleteMessage(messageId);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE']
}));
