/**
 * Listing Broadcast API Route - POST manual broadcast to followers
 *
 * Allows listing owners to send manual broadcast notifications to all
 * users who have bookmarked (followed) their listing.
 *
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 */

import { getFollowerBroadcastService } from '@core/services/FollowerBroadcastService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';

// ============================================================================
// POST - Send manual broadcast to listing followers
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      401
    );
  }

  // Extract listing id from URL path: /api/listings/[id]/broadcast
  const segments = request.nextUrl.pathname.split('/');
  const listingIdStr = segments[segments.indexOf('listings') + 1];
  const listingId = parseInt(listingIdStr ?? '', 10);

  if (isNaN(listingId) || listingId <= 0) {
    return createErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      400
    );
  }

  // Verify ownership: user must be the listing claimant or an admin
  const db = getDatabaseService();
  const listingResult = await db.query<{
    claimant_user_id: number | null;
    business_name: string;
    slug: string;
  }>(
    'SELECT claimant_user_id, business_name, slug FROM listings WHERE id = ?',
    [listingId]
  );

  if (listingResult.rows.length === 0) {
    return createErrorResponse(
      BizError.notFound('Listing not found'),
      404
    );
  }

  const listing = listingResult.rows[0];
  if (!listing) {
    return createErrorResponse(
      BizError.notFound('Listing not found'),
      404
    );
  }

  const isOwner = listing.claimant_user_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return createErrorResponse(
      BizError.forbidden('Only the listing owner can broadcast to followers'),
      403
    );
  }

  // Parse request body
  let body: { title?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      BizError.badRequest('Invalid JSON body'),
      400
    );
  }

  const { title, message } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return createErrorResponse(
      BizError.badRequest('title is required'),
      400
    );
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return createErrorResponse(
      BizError.badRequest('message is required'),
      400
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bizconekt.com';
  const actionUrl = `${baseUrl}/listings/${listing.slug}`;

  const broadcastService = getFollowerBroadcastService();
  const result = await broadcastService.broadcastToFollowers(
    listingId,
    title.trim(),
    message.trim(),
    actionUrl
  );

  return createSuccessResponse({ broadcast: result });
});
