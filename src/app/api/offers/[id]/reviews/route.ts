/**
 * GET/POST /api/offers/[id]/reviews
 * Get offer reviews or submit a review
 *
 * @tier STANDARD
 * @phase Phase 4.5.5 - Technical Debt Resolution (TD-P4-011)
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { NotificationService } from '@core/services/NotificationService';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { awardReviewPoints } from '@core/utils/review-rewards';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/offers/[id]/reviews
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const offerService = getOfferService();
  const result = await offerService.getOfferReviews(parseInt(offerId, 10), { page, limit });
  const summary = await offerService.getOfferReviewSummary(parseInt(offerId, 10));

  return createSuccessResponse(
    {
      reviews: result.data,
      summary,
      hasMore: result.pagination.page < result.pagination.totalPages,
      page: result.pagination.page
    },
    context.requestId
  );
});

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();
  const { claim_id, rating, was_as_described, was_easy_to_redeem, comment, images } = body;

  if (!claim_id) {
    return createErrorResponse(
      BizError.badRequest('You must claim this offer before leaving a review'),
      context.requestId
    );
  }

  if (!rating || rating < 1 || rating > 5) {
    return createErrorResponse(
      BizError.badRequest('rating is required and must be between 1 and 5'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  const review = await offerService.submitReview(
    claim_id,
    user.id,
    { rating, was_as_described, was_easy_to_redeem, comment, images }
  );

  // Extract offer ID from URL for notification lookup
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = parseInt(pathSegments[pathSegments.length - 2] || '0', 10);

  // Fire-and-forget: notifications + analytics
  const db = getDatabaseService();

  db.query<{ listing_id: number; title: string }>(
    'SELECT listing_id, title FROM offers WHERE id = ? LIMIT 1',
    [offerId]
  ).then(offerResult => {
    const offer = offerResult.rows[0];
    if (offer) {
      return db.query<{ user_id: number }>(
        'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
        [offer.listing_id]
      ).then(listingResult => {
        const listing = listingResult.rows[0];
        if (listing && listing.user_id !== Number(user.id)) {
          const notificationService = new NotificationService(db);
          notificationService.dispatch({
            type: 'review.received',
            recipientId: listing.user_id,
            title: 'New review on your offer',
            message: `Someone left a ${rating}-star review on "${offer.title}"`,
            entityType: 'review',
            entityId: (review as { id?: number }).id,
            actionUrl: `/offers/${offerId}`,
            priority: 'normal',
            triggeredBy: Number(user.id),
          }).catch(() => {});
        }
      });
    }
  }).catch(() => {});

  // Track analytics conversion + reward points
  const analyticsService = new InternalAnalyticsService(db);
  analyticsService.trackConversion({
    conversionType: 'review_submitted',
    userId: Number(user.id),
  }).catch(() => {});

  awardReviewPoints(Number(user.id), {
    reviewText: comment,
    images: images,
    entityType: 'offer',
    entityId: offerId,
  });

  return createSuccessResponse({ review }, context.requestId);
});
