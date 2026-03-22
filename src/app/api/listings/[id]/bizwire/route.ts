/**
 * BizWire Listing Route
 * POST /api/listings/[id]/bizwire - Send new BizWire message (any authenticated user)
 * GET  /api/listings/[id]/bizwire - List BizWire threads for listing (listing owner only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf wrapper: MANDATORY for POST
 * - DatabaseService boundary: Service layer handles all DB operations
 * - No user ID from request body — always from context.userId (session)
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService, getNotificationService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { MessageType } from '@core/services/ListingMessageService';
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
 * GET /api/listings/[id]/bizwire
 * List BizWire thread summaries for a listing (listing owner only)
 * Query params: page, limit, status, search
 *
 * @authenticated Listing owner only
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
  }

  const userId = context.userId;
  if (!userId) throw BizError.unauthorized('Authentication required');
  const ownerId = parseInt(userId);
  if (isNaN(ownerId)) throw BizError.badRequest('Invalid user ID');

  // Verify listing ownership
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  if (!listing || listing.user_id !== ownerId) {
    throw BizError.forbidden('You do not have permission to access this resource');
  }

  // Parse query params
  const page = parseInt(reqUrl.searchParams.get('page') || '1');
  const limit = parseInt(reqUrl.searchParams.get('limit') || '20');
  const status = reqUrl.searchParams.get('status') || undefined;
  const search = reqUrl.searchParams.get('search') || undefined;

  const service = getListingMessageService();
  const result = await service.getListingBizWireThreads(
    listingId,
    { status: status as any, search },
    { page, limit }
  );

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});

/**
 * POST /api/listings/[id]/bizwire
 * Send a new BizWire message to a listing (any authenticated user)
 * Body: { subject, content, message_type, source_page, source_url, source_entity_type, source_entity_id }
 *
 * @authenticated Any authenticated user can send
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const rateLimitResponse = await rateLimitMiddleware(RATE_LIMITS.BIZWIRE)(context.request);
  if (rateLimitResponse) return rateLimitResponse;

  const reqUrl = new URL(context.request.url);
  const segments = reqUrl.pathname.split('/');
  const idSegment = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(idSegment || '');
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id: idSegment });
  }

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

  // Verify listing exists
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  if (!listing) {
    throw BizError.notFound('Listing not found');
  }

  // Create BizWire message
  const service = getListingMessageService();
  const messageId = await service.createBizWireMessage(listingId, senderId, {
    subject: requestBody.subject as string | undefined,
    content: requestBody.content as string,
    message_type: requestBody.message_type as MessageType | undefined,
    source_page: requestBody.source_page as string | undefined,
    source_url: requestBody.source_url as string | undefined,
  });

  // Track analytics (best-effort — do not fail the route)
  try {
    const analyticsService = new BizWireAnalyticsService(getDatabaseService());
    await analyticsService.trackEvent({
      listing_id: listingId,
      sender_user_id: senderId,
      message_id: messageId,
      source_page: (requestBody.source_page as string) || 'unknown',
      source_entity_type: requestBody.source_entity_type as string | undefined,
      source_entity_id: requestBody.source_entity_id as number | undefined,
      action: 'message_sent',
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
    await notificationService.notifyNewMessage(messageId, listingId, senderId);
  } catch (_notifErr) {
    // Notification failure should not fail the request
  }

  return createSuccessResponse({ message_id: messageId }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST']
}));
