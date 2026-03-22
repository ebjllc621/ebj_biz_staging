/**
 * Internet Personality Reviews API Route
 * GET /api/content/internet-personalities/[slug]/reviews - Reviews for a personality
 * POST /api/content/internet-personalities/[slug]/reviews - Submit a review
 *
 * @authority Tier3_Phases/PHASE_2_PUBLIC_API_ROUTES.md
 * @authority Tier3_Phases/PHASE_6_REVIEW_SYSTEM.md
 * @tier SIMPLE
 * @phase Tier 3 - Phase 2 (GET), Phase 6 (POST)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
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

  const personalityId = parseInt(idParam || '');
  if (isNaN(personalityId)) {
    throw BizError.badRequest('Invalid personality ID');
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
  const personalityService = new InternetPersonalityService(db);

  const result = await personalityService.getReviews(personalityId, { page, pageSize });

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
  const personalityId = parseInt(idParam || '');
  if (isNaN(personalityId)) {
    throw BizError.badRequest('Invalid personality ID');
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
  const collaborationType = typeof body.collaboration_type === 'string' ? body.collaboration_type.trim() : undefined;
  const images = Array.isArray(body.images) ? (body.images as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 6) : undefined;

  // Service + duplicate check
  const db = getDatabaseService();
  const service = new InternetPersonalityService(db);
  const alreadyReviewed = await service.hasUserReviewed(personalityId, Number(user.id));
  if (alreadyReviewed) {
    return createErrorResponse(BizError.badRequest('You have already reviewed this profile'), context.requestId);
  }

  // Create review
  const review = await service.createReview(personalityId, Number(user.id), {
    rating,
    review_text: reviewText,
    collaboration_type: collaborationType,
    ...(images && images.length > 0 && { images }),
  });

  // Fire-and-forget: Reward points
  awardReviewPoints(Number(user.id), {
    reviewText: body.review_text || null,
    images: body.images || null,
    entityType: 'internet_personality',
    entityId: personalityId,
  });

  // Fire-and-forget: Analytics
  const analyticsService = new InternalAnalyticsService(db);
  analyticsService.trackConversion({
    conversionType: 'review_submitted',
    userId: Number(user.id),
  }).catch(() => {});

  // Fire-and-forget: Notification to profile owner
  const personality = await service.getPersonalityById(personalityId);
  if (personality) {
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'content.review_received',
      recipientId: personality.user_id,
      title: 'New review received',
      message: `Someone left a ${rating}-star review on your profile`,
      entityType: 'review',
      entityId: review.id,
      actionUrl: `/internet-personalities/${personality.slug}`,
      priority: 'normal',
      triggeredBy: Number(user.id),
    }).catch(() => {});
  }

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
});
