/**
 * Admin Review Testimonial Highlight API Route
 *
 * PATCH /api/admin/reviews/[id]/testimonial
 * Toggle is_featured flag on a review (highlight/unhighlight as testimonial)
 *
 * Implementation:
 *   1. Extract review ID from URL path
 *   2. SELECT current is_featured value
 *   3. UPDATE with toggled boolean
 *   4. Log admin activity
 *   5. Return updated review fields
 *
 * @authority PHASE_2_BRAIN_PLAN.md Task 2.5
 * @tier STANDARD
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';

interface ReviewCurrentRow {
  id: bigint | number | null;
  is_featured: bigint | number | null;
  review_text: string | null;
  rating: bigint | number | null;
  status: string;
}

// GOVERNANCE: CSRF protection for state-changing operations
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // Path: /api/admin/reviews/[id]/testimonial
  // 'testimonial' is last segment, [id] is second to last
  const testimonialIndex = segments.indexOf('testimonial');
  const rawId = segments[testimonialIndex - 1];
  const reviewId = parseInt(rawId || '0');

  if (!reviewId || isNaN(reviewId)) {
    throw BizError.badRequest('Invalid review ID', { rawId });
  }

  const db = getDatabaseService();

  // Step 1: Get current is_featured value
  const currentResult = await db.query<ReviewCurrentRow>(
    'SELECT id, is_featured, review_text, rating, status FROM reviews WHERE id = ? LIMIT 1',
    [reviewId]
  );

  if (!currentResult.rows[0]) {
    throw BizError.notFound('Review', reviewId);
  }

  const current = currentResult.rows[0];
  const currentFeatured = Boolean(current.is_featured);
  const newFeatured = !currentFeatured;

  // Step 2: Toggle is_featured
  await db.query(
    'UPDATE reviews SET is_featured = ?, updated_at = NOW() WHERE id = ?',
    [newFeatured ? 1 : 0, reviewId]
  );

  // Step 3: Log admin activity (fire-and-forget)
  const adminId = parseInt(context.userId!);
  getAdminActivityService().logActivity({
    adminUserId: adminId,
    targetEntityType: 'review',
    targetEntityId: reviewId,
    actionType: 'review_testimonial_updated',
    actionCategory: 'moderation',
    actionDescription: `${newFeatured ? 'Highlighted' : 'Removed highlight from'} review #${reviewId} as testimonial`,
    beforeData: { is_featured: currentFeatured },
    afterData: { is_featured: newFeatured },
    severity: 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({
    review: {
      id: bigIntToNumber(current.id),
      rating: bigIntToNumber(current.rating),
      comment: current.review_text || '',
      status: current.status,
      highlighted_as_testimonial: newFeatured,
      entity_type: 'listing'
    }
  }, context.requestId);
}, { requireAuth: true, allowedMethods: ['PATCH'] }));
