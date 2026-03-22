/**
 * Affiliate Marketer Reviews API Route
 * GET /api/content/affiliate-marketers/[slug]/reviews - Reviews for a marketer
 * POST /api/content/affiliate-marketers/[slug]/reviews - Submit a review
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @authority Tier3_Phases/PHASE_6_REVIEW_SYSTEM.md
 * @tier SIMPLE
 * @phase Tier 3 - Phase 2 (GET), Phase 6 (POST)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { NotificationService } from '@core/services/NotificationService';
import { InternalAnalyticsService } from '@core/services/InternalAnalyticsService';
import { awardReviewPoints } from '@core/utils/review-rewards';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const GET = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  // Next.js 15 async params
  const params = await routeParams?.params;
  const idParam = params?.slug;

  const marketerId = parseInt(idParam || '');
  if (isNaN(marketerId)) {
    throw BizError.badRequest('Invalid marketer ID');
  }

  const { request } = context;
  const { searchParams } = new URL(request.url);

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  // Validate pagination
  if (isNaN(page) || page < 1) {
    throw BizError.badRequest('Invalid page parameter', { page: searchParams.get('page') });
  }
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 50) {
    throw BizError.badRequest('Invalid pageSize parameter', { pageSize: searchParams.get('pageSize') });
  }

  // Initialize service
  const db = getDatabaseService();
  const marketerService = new AffiliateMarketerService(db);

  const result = await marketerService.getReviews(marketerId, { page, pageSize });

  return createSuccessResponse({
    reviews: result.data,
    pagination: result.pagination
  }, context.requestId);
}, {
  allowedMethods: ['GET']
});

export const POST = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  const params = await routeParams?.params;
  const idParam = params?.slug;
  const marketerId = parseInt(idParam || '');
  if (isNaN(marketerId)) {
    throw BizError.badRequest('Invalid marketer ID');
  }

  // Auth
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  // Parse body
  const body = await context.request.json();
  const rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return createErrorResponse(BizError.badRequest('Rating must be integer 1-5'), context.requestId);
  }
  const reviewText = typeof body.review_text === 'string' ? body.review_text.trim() : undefined;
  if (reviewText && reviewText.length < 20) {
    return createErrorResponse(BizError.badRequest('Review text must be at least 20 characters'), context.requestId);
  }
  if (reviewText && reviewText.length > 2000) {
    return createErrorResponse(BizError.badRequest('Review text must not exceed 2000 characters'), context.requestId);
  }
  const campaignType = typeof body.campaign_type === 'string' ? body.campaign_type.trim() : undefined;
  const images = Array.isArray(body.images) ? (body.images as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 6) : undefined;

  // Service + duplicate check
  const db = getDatabaseService();
  const service = new AffiliateMarketerService(db);
  const alreadyReviewed = await service.hasUserReviewed(marketerId, Number(user.id));
  if (alreadyReviewed) {
    return createErrorResponse(BizError.badRequest('You have already reviewed this profile'), context.requestId);
  }

  // Create review
  const review = await service.createReview(marketerId, Number(user.id), {
    rating,
    review_text: reviewText,
    campaign_type: campaignType,
    ...(images && images.length > 0 && { images }),
  });

  // Fire-and-forget: Reward points
  awardReviewPoints(Number(user.id), {
    reviewText: body.review_text || null,
    images: body.images || null,
    entityType: 'affiliate_marketer',
    entityId: marketerId,
  });

  // Fire-and-forget: Analytics
  const analyticsService = new InternalAnalyticsService(db);
  analyticsService.trackConversion({
    conversionType: 'review_submitted',
    userId: Number(user.id),
  }).catch(() => {});

  // Fire-and-forget: Notification to profile owner
  const marketer = await service.getMarketerById(marketerId);
  if (marketer) {
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'content.review_received',
      recipientId: marketer.user_id,
      title: 'New review received',
      message: `Someone left a ${rating}-star review on your profile`,
      entityType: 'review',
      entityId: review.id,
      actionUrl: `/affiliate-marketers/${marketer.slug}`,
      priority: 'normal',
      triggeredBy: Number(user.id),
    }).catch(() => {});
  }

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
});
