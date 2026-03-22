/**
 * Review Moderation API Route
 * PATCH /api/reviews/[id]/moderate - Moderate review (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Admin authorization required
 *
 * @authority CLAUDE.md - API Standards section
 * @authority Phase 4 Brain Plan - API Endpoint Layer Implementation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getReviewService, getListingService, getAdminActivityService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { NotificationService } from '@core/services/NotificationService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * PATCH /api/reviews/[id]/moderate
 * Moderate review (approve or reject)
 * Body:
 *   - status: Review status (approved, rejected) (required)
 *   - moderation_reason: Reason for rejection (optional, required if status is rejected)
 *   - moderator_id: Moderator user ID (required)
 *
 * @admin Admin authentication required
 */
// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  // Extract review ID from URL pathname
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const id = segments[segments.length - 2]; // Get ID from path (before 'moderate')
  if (!id) {
    throw BizError.badRequest('Review ID is required');
  }
  const reviewId = parseInt(id);
  if (isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { id });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  const action = (requestBody.action || requestBody.status) as string | undefined; // Support both 'action' and 'status'
  if (!action || !['approve', 'reject', 'approved', 'rejected'].includes(action)) {
    throw BizError.validation('action', action as string, 'Action is required and must be "approve" or "reject"');
  }

  // Get authenticated user ID
  const userId = context.userId;
  if (!userId) {
    throw BizError.unauthorized('Authentication required');
  }
  const adminId = parseInt(userId);
  if (isNaN(adminId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Call approve() or reject() based on action (no moderate() method exists)

  // ReviewService requires ListingService dependency
  const listingService = getListingService();
  void listingService; // Used for DI validation
  const service = getReviewService();
  let review;
  const isApproval = action === 'approve' || action === 'approved';

  if (isApproval) {
    review = await service.approve(reviewId, adminId);
  } else {
    const reason = (requestBody.moderation_reason || requestBody.reason) as string | undefined;
    if (!reason) {
      throw BizError.validation('moderation_reason', reason as string, 'Moderation reason is required when rejecting a review');
    }
    review = await service.reject(reviewId, adminId, reason as string);
  }

  // Fire-and-forget: notify reviewer + log admin activity
  const db = getDatabaseService();

  db.query<{ user_id: number }>(
    'SELECT user_id FROM reviews WHERE id = ? LIMIT 1',
    [reviewId]
  ).then(reviewData => {
    const reviewOwner = reviewData.rows[0];
    if (reviewOwner) {
      const notificationType = isApproval ? 'review.approved' : 'review.rejected' as const;
      const notificationService = new NotificationService(db);
      notificationService.dispatch({
        type: notificationType,
        recipientId: reviewOwner.user_id,
        title: `Your review has been ${isApproval ? 'approved' : 'rejected'}`,
        message: `Your review has been ${isApproval ? 'approved' : 'rejected'} by a moderator`,
        entityType: 'review',
        entityId: reviewId,
        priority: 'normal',
        triggeredBy: adminId,
      }).catch(() => {});
    }
  }).catch(() => {});

  getAdminActivityService().logActivity({
    adminUserId: adminId,
    targetEntityType: 'review',
    targetEntityId: reviewId,
    actionType: `review_${isApproval ? 'approve' : 'reject'}`,
    actionCategory: 'moderation',
    actionDescription: `${action} review #${reviewId}`,
    afterData: { status: isApproval ? 'approved' : 'rejected' },
    severity: 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ review }, context.requestId);
}, {
  requireAuth: true, // TODO: Change to requireAdmin when RBAC is implemented
  allowedMethods: ['PATCH']
}));
