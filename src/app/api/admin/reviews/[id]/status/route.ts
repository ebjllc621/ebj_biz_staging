/**
 * Admin Review Status Change API Route
 *
 * PATCH /api/admin/reviews/[id]/status
 * Change the status of a review (approved | rejected | pending)
 *
 * Implementation:
 *   - approved: ReviewService.approve(id, adminId) — updates status + moderated_by
 *   - rejected: ReviewService.reject(id, adminId, reason) — same + moderation_reason
 *   - pending: direct UPDATE query (no service method for resetting to pending)
 *   - Fires notification to review author
 *   - Logs admin activity
 *
 * @authority PHASE_2_BRAIN_PLAN.md Task 2.4
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getReviewService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { NotificationService } from '@core/services/NotificationService';

const VALID_STATUSES = ['approved', 'rejected', 'pending'] as const;
type ReviewStatus = typeof VALID_STATUSES[number];

// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL path
  // Path: /api/admin/reviews/[id]/status — id is two segments before end
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const statusIndex = segments.indexOf('status');
  const rawId = segments[statusIndex - 1];
  const reviewId = parseInt(rawId || '0');

  if (!reviewId || isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { rawId });
  }

  // Parse body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;
  const status = requestBody.status as string;

  if (!status || !VALID_STATUSES.includes(status as ReviewStatus)) {
    throw BizError.validation('status', status, 'Status must be approved, rejected, or pending');
  }

  const adminId = parseInt(context.userId!);
  if (isNaN(adminId)) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const service = getReviewService();
  let review;

  if (status === 'approved') {
    review = await service.approve(reviewId, adminId);
  } else if (status === 'rejected') {
    const reason = (requestBody.reason as string) || 'Admin status change';
    review = await service.reject(reviewId, adminId, reason);
  } else {
    // 'pending' — reset to pending (no service method exists for this)
    await db.query(
      `UPDATE reviews SET status = 'pending', moderated_by = NULL, moderated_at = NULL, moderation_reason = NULL, updated_at = NOW() WHERE id = ?`,
      [reviewId]
    );
    const updated = await db.query<{ id: unknown; listing_id: unknown; user_id: unknown; rating: unknown; review_text: string | null; status: string; is_featured: unknown; created_at: string }>(
      'SELECT id, listing_id, user_id, rating, review_text, status, is_featured, created_at FROM reviews WHERE id = ? LIMIT 1',
      [reviewId]
    );
    review = updated.rows[0] || null;
  }

  // Fire-and-forget: notify review author + log admin activity
  if (status !== 'pending') {
    db.query<{ user_id: unknown }>(
      'SELECT user_id FROM reviews WHERE id = ? LIMIT 1',
      [reviewId]
    ).then(reviewData => {
      const reviewOwner = reviewData.rows[0];
      if (reviewOwner) {
        const isApproval = status === 'approved';
        const notificationType = isApproval ? 'review.approved' : 'review.rejected' as const;
        const notificationService = new NotificationService(db);
        notificationService.dispatch({
          type: notificationType,
          recipientId: reviewOwner.user_id as number,
          title: `Your review has been ${isApproval ? 'approved' : 'rejected'}`,
          message: `Your review has been ${isApproval ? 'approved' : 'rejected'} by an administrator`,
          entityType: 'review',
          entityId: reviewId,
          priority: 'normal',
          triggeredBy: adminId,
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  getAdminActivityService().logActivity({
    adminUserId: adminId,
    targetEntityType: 'review',
    targetEntityId: reviewId,
    actionType: `review_status_${status}`,
    actionCategory: 'moderation',
    actionDescription: `Changed review #${reviewId} status to ${status}`,
    afterData: { status },
    severity: 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ review }, context.requestId);
}, { requireAuth: true, allowedMethods: ['PATCH'] }));
