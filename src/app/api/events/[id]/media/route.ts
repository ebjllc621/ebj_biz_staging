/**
 * Event Media API Routes
 *
 * GET /api/events/[id]/media - Get all media for an event
 * POST /api/events/[id]/media - Add media to an event (requires auth)
 * PATCH /api/events/[id]/media - Reorder media (requires auth)
 * DELETE /api/events/[id]/media?mediaId=X - Delete specific media (requires auth)
 *
 * @authority docs/modals/refactor/phases/PHASE_2_DATABASE_API.md
 * @phase Phase 2 - Database & API Foundation
 */

import { getEventService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * Extract event ID from URL path
 * Path is /api/events/[id]/media
 */
function extractEventIdFromUrl(url: URL): number | null {
  const pathParts = url.pathname.split('/');
  // id is at index before 'media'
  const idIndex = pathParts.indexOf('media') - 1;
  if (idIndex < 0) return null;
  const idStr = pathParts[idIndex];
  if (!idStr) return null;
  const id = parseInt(idStr);
  return isNaN(id) ? null : id;
}

/**
 * GET /api/events/[id]/media
 * Get all media for an event (public)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const eventId = extractEventIdFromUrl(url);

  if (!eventId) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const eventService = getEventService();

  // Verify event exists
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  const media = await eventService.getMedia(eventId);
  const limits = await eventService.getMediaLimits(eventId);

  return createSuccessResponse({
    media,
    limits
  }, 200);
});

/**
 * POST /api/events/[id]/media
 * Add media to an event (requires auth + event ownership via listing)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const eventId = extractEventIdFromUrl(url);

  if (!eventId) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const body = await context.request.json();
  const { media_type, file_url, alt_text, embed_url, platform, source } = body;

  if (!media_type || !['image', 'video'].includes(media_type)) {
    return createErrorResponse('media_type must be "image" or "video"', 400);
  }

  if (!file_url) {
    return createErrorResponse('file_url is required', 400);
  }

  const eventService = getEventService();
  const listingService = getListingService();

  // Get event and verify listing ownership
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  if (!event.listing_id) {
    return createErrorResponse('Event has no associated listing', 400);
  }
  const listing = await listingService.getById(event.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this event', 403);
  }

  const media = await eventService.addMedia(eventId, {
    media_type,
    file_url,
    alt_text,
    embed_url,
    platform,
    source,
  });

  // Auto-set banner_image if this is the first image and banner_image is not set
  if (media_type === 'image' && !event.banner_image) {
    try {
      await eventService.update(eventId, { banner_image: file_url, thumbnail: file_url });
    } catch {
      // Non-blocking — media record is already saved
      console.error('[EventMediaAPI] Failed to auto-set banner_image');
    }
  }

  return createSuccessResponse({
    media,
    message: 'Media added successfully'
  }, 201);
}));

/**
 * PATCH /api/events/[id]/media
 * Reorder media items (requires auth + event ownership via listing)
 * Body: { mediaIds: number[] }
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const eventId = extractEventIdFromUrl(url);

  if (!eventId) {
    return createErrorResponse('Invalid event ID', 400);
  }

  const body = await context.request.json();
  const { mediaIds } = body;

  if (!Array.isArray(mediaIds)) {
    return createErrorResponse('mediaIds array is required', 400);
  }

  const eventService = getEventService();
  const listingService = getListingService();

  // Get event and verify listing ownership
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  if (!event.listing_id) {
    return createErrorResponse('Event has no associated listing', 400);
  }
  const listing = await listingService.getById(event.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this event', 403);
  }

  await eventService.reorderMedia(eventId, mediaIds);

  // Return updated media list
  const media = await eventService.getMedia(eventId);

  return createSuccessResponse({
    media,
    message: 'Media reordered successfully'
  }, 200);
}));

/**
 * DELETE /api/events/[id]/media?mediaId=X
 * Delete specific media (requires auth + event ownership via listing)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const eventId = extractEventIdFromUrl(url);
  const mediaId = parseInt(url.searchParams.get('mediaId') || '');

  if (!eventId) {
    return createErrorResponse('Invalid event ID', 400);
  }

  if (isNaN(mediaId)) {
    return createErrorResponse('mediaId query parameter is required', 400);
  }

  const eventService = getEventService();
  const listingService = getListingService();

  // Get event and verify listing ownership
  const event = await eventService.getById(eventId);
  if (!event) {
    return createErrorResponse('Event not found', 404);
  }

  if (!event.listing_id) {
    return createErrorResponse('Event has no associated listing', 400);
  }
  const listing = await listingService.getById(event.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this event', 403);
  }

  // Verify media belongs to this event
  const mediaItem = await eventService.getMediaById(mediaId);
  if (!mediaItem || mediaItem.event_id !== eventId) {
    return createErrorResponse('Media not found for this event', 404);
  }

  await eventService.deleteMedia(mediaId);

  return createSuccessResponse({
    message: 'Media deleted successfully'
  }, 200);
}));
