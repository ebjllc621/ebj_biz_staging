/**
 * BizWire Thread Route
 * GET /api/listings/[id]/bizwire/[threadId] - Get full thread conversation + mark as read
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Thread participation check: listing owner OR thread participant
 *
 * @authority docs/components/contactListing/phases/PHASE_4_PLAN.md
 * @reference src/app/api/listings/[id]/messages/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getListingMessageService, getListingService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizWireAnalyticsService } from '@core/services/BizWireAnalyticsService';
import { DashboardService } from '@features/dashboard/services/DashboardService';

/**
 * GET /api/listings/[id]/bizwire/[threadId]
 * Get full thread conversation + mark as read
 * Access: listing owner OR thread participant
 *
 * @authenticated Listing owner or thread participant
 */
export const GET = apiHandler(async (context: ApiContext) => {
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

  // Get thread messages first (needed for participation check)
  const service = getListingMessageService();
  const messages = await service.getThread(threadId);
  if (messages.length === 0) {
    throw BizError.notFound('Thread not found');
  }

  // Verify access: listing owner OR thread participant
  const listingService = getListingService();
  const listing = await listingService.getById(listingId);
  const isListingOwner = listing && listing.user_id === ownerId;
  const isParticipant = messages.some(m => m.sender_user_id === ownerId);

  if (!isListingOwner && !isParticipant) {
    throw BizError.forbidden('You do not have access to this thread');
  }

  // Mark thread as read for this user
  await service.markThreadAsRead(threadId, ownerId);

  // Also mark BizWire user_notifications as read (clears sidebar badge)
  try {
    const db = getDatabaseService();
    const dashboardService = new DashboardService(db);
    await dashboardService.markNotificationsByTypeRead(ownerId, 'bizwire');
  } catch (_notifErr) {
    // Notification mark-read failure should not fail the request
  }

  // Track analytics (best-effort — do not fail the route)
  try {
    const analyticsService = new BizWireAnalyticsService(getDatabaseService());
    await analyticsService.trackEvent({
      listing_id: listingId,
      sender_user_id: ownerId,
      source_page: 'thread_view',
      action: 'message_read',
    });
  } catch (_analyticsErr) {
    // Analytics failure should not fail the request
  }

  return createSuccessResponse({ messages }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
