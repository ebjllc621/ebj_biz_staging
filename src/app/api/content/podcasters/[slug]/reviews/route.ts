/**
 * Podcaster Reviews API Route
 * GET /api/content/podcasters/[slug]/reviews - Reviews for a podcaster profile
 * POST /api/content/podcasters/[slug]/reviews - Submit a review
 *
 * @authority PODCASTER_PARITY_BRAIN_PLAN.md - Phase 5, Task 5.5
 * @tier SIMPLE
 * @phase Tier 3 - Phase 5 (GET + POST)
 * @reference src/app/api/content/affiliate-marketers/[slug]/reviews/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PodcasterService, PodcasterNotFoundError } from '@core/services/PodcasterService';
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
  const slug = params?.slug;

  if (!slug) {
    throw BizError.badRequest('Slug parameter is required');
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
  const podcasterService = new PodcasterService(db);

  try {
    const podcaster = await podcasterService.getPodcasterBySlug(slug);
    if (!podcaster) {
      throw new PodcasterNotFoundError(slug);
    }

    const result = await podcasterService.getReviews(podcaster.id, { page, pageSize });

    return createSuccessResponse({
      reviews: result.data,
      pagination: result.pagination
    }, context.requestId);
  } catch (error) {
    if (error instanceof PodcasterNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  allowedMethods: ['GET']
});

export const POST = apiHandler(async (context: ApiContext, routeParams?: RouteParams) => {
  const params = await routeParams?.params;
  const slug = params?.slug;

  if (!slug) {
    throw BizError.badRequest('Slug parameter is required');
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
  const episodeReference = typeof body.episode_reference === 'string' ? body.episode_reference.trim() : undefined;
  const images = Array.isArray(body.images) ? (body.images as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 6) : undefined;

  // Initialize service + resolve slug
  const db = getDatabaseService();
  const service = new PodcasterService(db);

  try {
    const podcaster = await service.getPodcasterBySlug(slug);
    if (!podcaster) {
      throw new PodcasterNotFoundError(slug);
    }

    // Duplicate check
    const alreadyReviewed = await service.hasUserReviewed(podcaster.id, Number(user.id));
    if (alreadyReviewed) {
      return createErrorResponse(BizError.badRequest('You have already reviewed this profile'), context.requestId);
    }

    // Create review
    const review = await service.createReview(podcaster.id, Number(user.id), {
      rating,
      review_text: reviewText,
      episode_reference: episodeReference,
      ...(images && images.length > 0 && { images }),
    });

    // Fire-and-forget: Reward points
    awardReviewPoints(Number(user.id), {
      reviewText: body.review_text || null,
      images: body.images || null,
      entityType: 'podcaster',
      entityId: podcaster.id,
    });

    // Fire-and-forget: Analytics
    const analyticsService = new InternalAnalyticsService(db);
    analyticsService.trackConversion({
      conversionType: 'review_submitted',
      userId: Number(user.id),
    }).catch(() => {});

    // Fire-and-forget: Notification to profile owner
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: 'content.review_received',
      recipientId: podcaster.user_id,
      title: 'New review received',
      message: `Someone left a ${rating}-star review on your podcaster profile`,
      entityType: 'review',
      entityId: review.id,
      actionUrl: `/podcasters/${podcaster.slug}`,
      priority: 'normal',
      triggeredBy: Number(user.id),
    }).catch(() => {});

    return createSuccessResponse({ review }, context.requestId);
  } catch (error) {
    if (error instanceof PodcasterNotFoundError) {
      return createErrorResponse(error, context.requestId);
    }
    throw error;
  }
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
});
