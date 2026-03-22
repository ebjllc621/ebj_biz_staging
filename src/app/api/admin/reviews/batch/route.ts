/**
 * Admin Reviews Batch Operations API Route
 *
 * POST /api/admin/reviews/batch
 * Perform bulk moderation actions on multiple reviews
 *
 * Request body:
 *   { action: 'approve' | 'reject' | 'delete', reviewIds: number[], reason?: string }
 *
 * Behavior:
 *   - Iterates through reviewIds, applies action to each
 *   - Does NOT abort on individual failure — collects all results
 *   - Fires notifications for approve/reject
 *   - Logs one batch admin activity entry (not per-review)
 *   - Admin delete uses direct DB query (bypasses ownership check in service)
 *
 * @authority PHASE_2_BRAIN_PLAN.md Task 2.3
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getReviewService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { NotificationService } from '@core/services/NotificationService';

const VALID_ACTIONS = ['approve', 'reject', 'delete'] as const;
type BatchAction = typeof VALID_ACTIONS[number];

interface BatchResult {
  id: number;
  status: 'success' | 'error';
  message?: string;
}

// GOVERNANCE: CSRF protection for state-changing POST
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
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
  const action = requestBody.action as string;
  const reviewIds = requestBody.reviewIds;
  const reason = (requestBody.reason as string) || 'Batch admin action';

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action as BatchAction)) {
    throw BizError.validation('action', action, 'Action must be approve, reject, or delete');
  }

  // Validate reviewIds
  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw BizError.badRequest('reviewIds must be a non-empty array');
  }

  const adminId = parseInt(context.userId!);
  if (isNaN(adminId)) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const service = getReviewService();
  const results: BatchResult[] = [];

  // Process each review — don't abort on individual failure
  for (const rawId of reviewIds) {
    const reviewId = parseInt(String(rawId));
    if (isNaN(reviewId)) {
      results.push({ id: rawId as number, status: 'error', message: 'Invalid review ID' });
      continue;
    }

    try {
      if (action === 'approve') {
        await service.approve(reviewId, adminId);
        results.push({ id: reviewId, status: 'success' });

        // Fire-and-forget notification
        db.query<{ user_id: unknown }>(
          'SELECT user_id FROM reviews WHERE id = ? LIMIT 1',
          [reviewId]
        ).then(reviewData => {
          const reviewOwner = reviewData.rows[0];
          if (reviewOwner) {
            const notificationService = new NotificationService(db);
            notificationService.dispatch({
              type: 'review.approved',
              recipientId: reviewOwner.user_id as number,
              title: 'Your review has been approved',
              message: 'Your review has been approved by an administrator',
              entityType: 'review',
              entityId: reviewId,
              priority: 'normal',
              triggeredBy: adminId,
            }).catch(() => {});
          }
        }).catch(() => {});

      } else if (action === 'reject') {
        await service.reject(reviewId, adminId, reason);
        results.push({ id: reviewId, status: 'success' });

        // Fire-and-forget notification
        db.query<{ user_id: unknown }>(
          'SELECT user_id FROM reviews WHERE id = ? LIMIT 1',
          [reviewId]
        ).then(reviewData => {
          const reviewOwner = reviewData.rows[0];
          if (reviewOwner) {
            const notificationService = new NotificationService(db);
            notificationService.dispatch({
              type: 'review.rejected',
              recipientId: reviewOwner.user_id as number,
              title: 'Your review has been rejected',
              message: 'Your review has been rejected by an administrator',
              entityType: 'review',
              entityId: reviewId,
              priority: 'normal',
              triggeredBy: adminId,
            }).catch(() => {});
          }
        }).catch(() => {});

      } else if (action === 'delete') {
        // Admin delete bypasses ownership check in ReviewService.delete()
        // Direct DB query required since admin is not the review owner
        await db.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        results.push({ id: reviewId, status: 'success' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({ id: reviewId, status: 'error', message });
    }
  }

  const processed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;

  // Log one batch admin activity entry
  getAdminActivityService().logActivity({
    adminUserId: adminId,
    targetEntityType: 'review',
    targetEntityId: reviewIds[0] as number,
    actionType: `review_batch_${action}`,
    actionCategory: 'moderation',
    actionDescription: `Batch ${action} ${processed} review(s) (${failed} failed)`,
    afterData: { action, total: reviewIds.length, processed, failed, reviewIds },
    severity: action === 'delete' ? 'high' : 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({
    processed,
    failed,
    results
  }, context.requestId);
}, { requireAuth: true, allowedMethods: ['POST'] }));
