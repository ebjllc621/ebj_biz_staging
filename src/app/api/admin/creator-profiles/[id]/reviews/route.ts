/**
 * Admin Creator Profile Reviews API Route
 * GET /api/admin/creator-profiles/[id]/reviews - List reviews for a profile
 * PATCH /api/admin/creator-profiles/[id]/reviews - Approve or reject a review
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf for PATCH: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber for all COUNT(*) results
 *
 * @authority CLAUDE.md - API Standards
 * @phase Tier 3 Creator Profiles - Phase 7
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { getAdminActivityService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { PodcasterService } from '@core/services/PodcasterService';
import { NotificationService } from '@core/services/NotificationService';

/**
 * Extract profile ID from URL path
 * Path: /api/admin/creator-profiles/[id]/reviews
 */
function extractProfileIdFromReviews(url: URL): number {
  const pathParts = url.pathname.split('/');
  // reviews is last segment, id is before it
  const reviewsIdx = pathParts.indexOf('reviews');
  const id = reviewsIdx > 0 ? pathParts[reviewsIdx - 1] : undefined;

  if (!id) {
    throw BizError.badRequest('Profile ID is required', {});
  }

  const profileId = parseInt(id, 10);

  if (isNaN(profileId)) {
    throw BizError.badRequest('Invalid profile ID', { id });
  }

  return profileId;
}

interface ReviewWithUser {
  id: number;
  marketer_id?: number;
  personality_id?: number;
  podcaster_id?: number;
  reviewer_user_id: number;
  reviewer_display_name: string | null;
  reviewer_avatar: string | null;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: Date;
}

/**
 * GET /api/admin/creator-profiles/[id]/reviews
 * List reviews for a specific profile
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('access creator profile reviews', 'admin');
  }

  const url = new URL(request.url);
  const profileId = extractProfileIdFromReviews(url);
  const searchParams = url.searchParams;

  const type = searchParams.get('type') as 'affiliate-marketers' | 'internet-personalities' | 'podcasters' | null;

  if (!type || (type !== 'affiliate-marketers' && type !== 'internet-personalities' && type !== 'podcasters')) {
    throw BizError.badRequest('type is required: affiliate-marketers | internet-personalities | podcasters', { type });
  }

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;
  const statusFilter = searchParams.get('status') || '';

  const db = getDatabaseService();

  if (type === 'affiliate-marketers') {
    let whereClause = 'r.marketer_id = ?';
    const params: unknown[] = [profileId];

    if (statusFilter) {
      whereClause += ' AND r.status = ?';
      params.push(statusFilter);
    }

    const countResult = await db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM affiliate_marketer_reviews r WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result = await db.query<ReviewWithUser>(
      `SELECT r.id, r.marketer_id, r.reviewer_user_id, r.rating, r.review_text, r.status, r.created_at,
              u.display_name as reviewer_display_name,
              u.avatar as reviewer_avatar
       FROM affiliate_marketer_reviews r
       LEFT JOIN users u ON u.id = r.reviewer_user_id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return createSuccessResponse({
      reviews: result.rows,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } else if (type === 'internet-personalities') {
    let whereClause = 'r.personality_id = ?';
    const params: unknown[] = [profileId];

    if (statusFilter) {
      whereClause += ' AND r.status = ?';
      params.push(statusFilter);
    }

    const countResult = await db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM internet_personality_reviews r WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result = await db.query<ReviewWithUser>(
      `SELECT r.id, r.personality_id, r.reviewer_user_id, r.rating, r.review_text, r.status, r.created_at,
              u.display_name as reviewer_display_name,
              u.avatar as reviewer_avatar
       FROM internet_personality_reviews r
       LEFT JOIN users u ON u.id = r.reviewer_user_id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return createSuccessResponse({
      reviews: result.rows,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } else {
    // podcasters
    let whereClause = 'r.podcaster_id = ?';
    const params: unknown[] = [profileId];

    if (statusFilter) {
      whereClause += ' AND r.status = ?';
      params.push(statusFilter);
    }

    const countResult = await db.query<{ total: bigint | number }>(
      `SELECT COUNT(*) as total FROM podcaster_reviews r WHERE ${whereClause}`,
      params
    );
    const total = bigIntToNumber(countResult.rows[0]?.total);

    const result = await db.query<ReviewWithUser>(
      `SELECT r.id, r.podcaster_id, r.reviewer_user_id, r.rating, r.review_text, r.status, r.created_at,
              u.display_name as reviewer_display_name,
              u.avatar as reviewer_avatar
       FROM podcaster_reviews r
       LEFT JOIN users u ON u.id = r.reviewer_user_id
       WHERE ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return createSuccessResponse({
      reviews: result.rows,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
});

/**
 * PATCH /api/admin/creator-profiles/[id]/reviews
 * Approve or reject a review
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);

  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  if (user.role !== 'admin') {
    throw BizError.forbidden('moderate creator profile reviews', 'admin');
  }

  const url = new URL(request.url);
  const profileId = extractProfileIdFromReviews(url);

  const body = await request.json();
  const { type, reviewId, action } = body as {
    type: 'affiliate-marketers' | 'internet-personalities' | 'podcasters';
    reviewId: number;
    action: 'approve' | 'reject';
  };

  if (!type || (type !== 'affiliate-marketers' && type !== 'internet-personalities' && type !== 'podcasters')) {
    throw BizError.badRequest('type is required', { type });
  }

  if (!reviewId || isNaN(Number(reviewId))) {
    throw BizError.badRequest('reviewId is required', { reviewId });
  }

  if (!action || (action !== 'approve' && action !== 'reject')) {
    throw BizError.badRequest('action must be: approve | reject', { action });
  }

  const db = getDatabaseService();
  const message = action === 'approve' ? 'Review approved' : 'Review rejected';

  if (type === 'affiliate-marketers') {
    const service = new AffiliateMarketerService(db);

    // Fetch review before action (for notification)
    const reviewResult = await db.query<{ reviewer_user_id: number; marketer_id: number }>(
      'SELECT reviewer_user_id, marketer_id FROM affiliate_marketer_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];

    if (!review) {
      throw BizError.notFound('Review', reviewId);
    }

    if (action === 'approve') {
      await service.approveReview(reviewId);
    } else {
      await service.rejectReview(reviewId);
    }

    // Dispatch notification to reviewer
    const notificationType = action === 'approve' ? 'content.review_approved' : 'content.review_rejected';
    const notificationTitle = action === 'approve' ? 'Your review has been approved' : 'Your review has been rejected';
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: notificationType,
      recipientId: review.reviewer_user_id,
      title: notificationTitle,
      message: `Your review for an affiliate marketer profile has been ${action}d`,
      entityType: 'content',
      entityId: review.marketer_id,
      priority: 'normal',
      triggeredBy: user.id,
    }).catch(() => {});

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'affiliate_marketer_review',
      targetEntityId: reviewId,
      actionType: `review_${action}`,
      actionCategory: 'moderation',
      actionDescription: `${action} affiliate marketer review #${reviewId} (profile #${profileId})`,
      afterData: { status: action === 'approve' ? 'approved' : 'rejected' },
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  } else if (type === 'internet-personalities') {
    const service = new InternetPersonalityService(db);

    // Fetch review before action (for notification)
    const reviewResult = await db.query<{ reviewer_user_id: number; personality_id: number }>(
      'SELECT reviewer_user_id, personality_id FROM internet_personality_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];

    if (!review) {
      throw BizError.notFound('Review', reviewId);
    }

    if (action === 'approve') {
      await service.approveReview(reviewId);
    } else {
      await service.rejectReview(reviewId);
    }

    // Dispatch notification to reviewer
    const notificationType = action === 'approve' ? 'content.review_approved' : 'content.review_rejected';
    const notificationTitle = action === 'approve' ? 'Your review has been approved' : 'Your review has been rejected';
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: notificationType,
      recipientId: review.reviewer_user_id,
      title: notificationTitle,
      message: `Your review for an internet personality profile has been ${action}d`,
      entityType: 'content',
      entityId: review.personality_id,
      priority: 'normal',
      triggeredBy: user.id,
    }).catch(() => {});

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'internet_personality_review',
      targetEntityId: reviewId,
      actionType: `review_${action}`,
      actionCategory: 'moderation',
      actionDescription: `${action} internet personality review #${reviewId} (profile #${profileId})`,
      afterData: { status: action === 'approve' ? 'approved' : 'rejected' },
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  } else {
    // podcasters
    const service = new PodcasterService(db);

    // Fetch review before action (for notification)
    const reviewResult = await db.query<{ reviewer_user_id: number; podcaster_id: number }>(
      'SELECT reviewer_user_id, podcaster_id FROM podcaster_reviews WHERE id = ?',
      [reviewId]
    );
    const review = reviewResult.rows[0];

    if (!review) {
      throw BizError.notFound('Review', reviewId);
    }

    if (action === 'approve') {
      await service.approveReview(reviewId);
    } else {
      await service.rejectReview(reviewId);
    }

    // Dispatch notification to reviewer
    const notificationType = action === 'approve' ? 'content.review_approved' : 'content.review_rejected';
    const notificationTitle = action === 'approve' ? 'Your review has been approved' : 'Your review has been rejected';
    const notificationService = new NotificationService(db);
    notificationService.dispatch({
      type: notificationType,
      recipientId: review.reviewer_user_id,
      title: notificationTitle,
      message: `Your review for a podcaster profile has been ${action}d`,
      entityType: 'content',
      entityId: review.podcaster_id,
      priority: 'normal',
      triggeredBy: user.id,
    }).catch(() => {});

    getAdminActivityService().logActivity({
      adminUserId: user.id,
      targetEntityType: 'podcaster_review',
      targetEntityId: reviewId,
      actionType: `review_${action}`,
      actionCategory: 'moderation',
      actionDescription: `${action} podcaster review #${reviewId} (profile #${profileId})`,
      afterData: { status: action === 'approve' ? 'approved' : 'rejected' },
      severity: 'normal',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      sessionId: request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true, message });
  }
}));
