/**
 * BizWire Thread Reply Route
 * POST /api/listings/[id]/bizwire/[threadId]/reply - Reply to a BizWire thread
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf wrapper: MANDATORY for POST
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Thread participation check: listing owner OR thread participant
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService, getNotificationService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizWireAnalyticsService } from '@core/services/BizWireAnalyticsService';
import { BizWireNotificationService } from '@core/services/notification/BizWireNotificationService';
import { rateLimitMiddleware } from '@core/middleware/rateLimitMiddleware';
import { RATE_LIMITS } from '@core/config/rateLimits';

function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * POST /api/listings/[id]/bizwire/[threadId]/reply
 * Reply to an existing BizWire thread
 * Body: { content }
 *
 * @authenticated Listing owner or thread participant
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const rateLimitResponse = await rateLimitMiddleware(RATE_LIMITS.BIZWIRE)(context.request);
  if (rateLimitResponse) return rateLimitResponse;

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
  const senderId = parseInt(userId);
  if (isNaN(senderId)) throw BizError.badRequest('Invalid user ID');

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (_parseErr) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required content field
  if (!requestBody.content || typeof requestBody.content !== 'string' || requestBody.content.trim() === '') {
    throw BizError.validation('content', requestBody.content, 'Content is required and must be a non-empty string');
  }

  // Get thread messages (needed for participation check + parent message)
  const service = getListingMessageService();
  const messages = await service.getThread(threadId);
  if (messages.length === 0) {
    throw BizError.notFound('Thread not found');
  }

  // Verify access: listing owner OR thread participant
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  const isListingOwner = listing && listing.user_id === senderId;
  const isParticipant = messages.some(m => m.sender_user_id === senderId);

  if (!isListingOwner && !isParticipant) {
    throw BizError.forbidden('You do not have access to this thread');
  }

  // Use latest message as the parent
  const parentMessage = messages[messages.length - 1];
  if (!parentMessage) {
    throw BizError.notFound('Thread not found');
  }
  const replyId = await service.replyToMessage(parentMessage.id, listingId, senderId, requestBody.content as string);

  // Track analytics (best-effort — do not fail the route)
  try {
    const analyticsService = new BizWireAnalyticsService(getDatabaseService());
    await analyticsService.trackEvent({
      listing_id: listingId,
      sender_user_id: senderId,
      message_id: replyId,
      source_page: 'thread_reply',
      action: 'reply_sent',
      device_type: getDeviceType(context.request.headers.get('user-agent')),
      referrer_url: context.request.headers.get('referer') || undefined,
    });
  } catch (_analyticsErr) {
    // Analytics failure should not fail the request
  }

  // Dispatch notification (best-effort — do not fail the route)
  try {
    const notificationService = new BizWireNotificationService(
      getDatabaseService(),
      getNotificationService()
    );
    await notificationService.notifyReply(replyId, threadId, listingId, senderId);
  } catch (_notifErr) {
    // Notification failure should not fail the request
  }

  return createSuccessResponse({ message_id: replyId }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
