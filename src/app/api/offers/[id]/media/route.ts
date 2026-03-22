/**
 * Offer Media API Routes
 *
 * GET /api/offers/[id]/media - Get all media for an offer
 * POST /api/offers/[id]/media - Add media to an offer (requires auth)
 * PATCH /api/offers/[id]/media - Reorder media (requires auth)
 * DELETE /api/offers/[id]/media?mediaId=X - Delete specific media (requires auth)
 *
 * @authority docs/modals/refactor/phases/PHASE_2_DATABASE_API.md
 * @phase Phase 2 - Database & API Foundation
 */

import { getOfferService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * Extract offer ID from URL path
 * Path is /api/offers/[id]/media
 */
function extractOfferIdFromUrl(url: URL): number | null {
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
 * GET /api/offers/[id]/media
 * Get all media for an offer (public)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const offerId = extractOfferIdFromUrl(url);

  if (!offerId) {
    return createErrorResponse('Invalid offer ID', 400);
  }

  const offerService = getOfferService();

  // Verify offer exists
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse('Offer not found', 404);
  }

  const media = await offerService.getMedia(offerId);
  const limits = await offerService.getMediaLimits(offerId);

  return createSuccessResponse({
    media,
    limits
  }, 200);
});

/**
 * POST /api/offers/[id]/media
 * Add media to an offer (requires auth + offer ownership via listing)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const offerId = extractOfferIdFromUrl(url);

  if (!offerId) {
    return createErrorResponse('Invalid offer ID', 400);
  }

  const body = await context.request.json();
  const { media_type, file_url, alt_text, embed_url, platform, source } = body;

  if (!media_type || !['image', 'video'].includes(media_type)) {
    return createErrorResponse('media_type must be "image" or "video"', 400);
  }

  if (!file_url) {
    return createErrorResponse('file_url is required', 400);
  }

  const offerService = getOfferService();
  const listingService = getListingService();

  // Get offer and verify listing ownership
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse('Offer not found', 404);
  }

  const listing = await listingService.getById(offer.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this offer', 403);
  }

  const media = await offerService.addMedia(offerId, {
    media_type,
    file_url,
    alt_text,
    embed_url,
    platform,
    source,
  });

  // Auto-set offer image if this is the first image and image is not set
  if (media_type === 'image' && !offer.image) {
    try {
      await offerService.update(offerId, { image: file_url });
    } catch {
      console.error('[OfferMediaAPI] Failed to auto-set offer image');
    }
  }

  return createSuccessResponse({
    media,
    message: 'Media added successfully'
  }, 201);
}));

/**
 * PATCH /api/offers/[id]/media
 * Reorder media items (requires auth + offer ownership via listing)
 * Body: { mediaIds: number[] }
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const offerId = extractOfferIdFromUrl(url);

  if (!offerId) {
    return createErrorResponse('Invalid offer ID', 400);
  }

  const body = await context.request.json();
  const { mediaIds } = body;

  if (!Array.isArray(mediaIds)) {
    return createErrorResponse('mediaIds array is required', 400);
  }

  const offerService = getOfferService();
  const listingService = getListingService();

  // Get offer and verify listing ownership
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse('Offer not found', 404);
  }

  const listing = await listingService.getById(offer.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this offer', 403);
  }

  await offerService.reorderMedia(offerId, mediaIds);

  // Return updated media list
  const media = await offerService.getMedia(offerId);

  return createSuccessResponse({
    media,
    message: 'Media reordered successfully'
  }, 200);
}));

/**
 * DELETE /api/offers/[id]/media?mediaId=X
 * Delete specific media (requires auth + offer ownership via listing)
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(context.request.url);
  const offerId = extractOfferIdFromUrl(url);
  const mediaId = parseInt(url.searchParams.get('mediaId') || '');

  if (!offerId) {
    return createErrorResponse('Invalid offer ID', 400);
  }

  if (isNaN(mediaId)) {
    return createErrorResponse('mediaId query parameter is required', 400);
  }

  const offerService = getOfferService();
  const listingService = getListingService();

  // Get offer and verify listing ownership
  const offer = await offerService.getById(offerId);
  if (!offer) {
    return createErrorResponse('Offer not found', 404);
  }

  const listing = await listingService.getById(offer.listing_id);
  if (!listing || listing.user_id !== user.id) {
    return createErrorResponse('Not authorized to modify this offer', 403);
  }

  // Verify media belongs to this offer
  const mediaItem = await offerService.getMediaById(mediaId);
  if (!mediaItem || mediaItem.offer_id !== offerId) {
    return createErrorResponse('Media not found for this offer', 404);
  }

  await offerService.deleteMedia(mediaId);

  return createSuccessResponse({
    message: 'Media deleted successfully'
  }, 200);
}));
