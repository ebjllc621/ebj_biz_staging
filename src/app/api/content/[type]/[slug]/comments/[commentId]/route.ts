/**
 * Content Comment Delete API Route
 * DELETE /api/content/[type]/[id]/comments/[commentId] — Delete own comment (soft delete)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (DELETE)
 * - Auth required: getUserFromRequest()
 * - Users can only delete their own comments (enforced at service layer)
 * - DatabaseService boundary: All DB operations via ContentInteractionService
 *
 * @authority CLAUDE.md - API Standards section
 * @reference src/app/api/content/[type]/[id]/bookmark/route.ts — URL extraction pattern
 * @phase Content Phase 3B
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getContentInteractionService } from '@core/services/ContentInteractionService';
import { withCsrf } from '@/lib/security/withCsrf';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

function extractCommentId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/content/[type]/[id]/comments/[commentId]
  // Find 'comments' then take the segment after it
  const commentsIndex = segments.indexOf('comments');
  if (commentsIndex < 0 || commentsIndex + 1 >= segments.length) {
    throw BizError.badRequest('Invalid comment URL structure');
  }

  const commentIdSegment = segments[commentsIndex + 1];
  const commentId = parseInt(commentIdSegment ?? '');
  if (!commentIdSegment || isNaN(commentId)) {
    throw BizError.badRequest('Invalid comment ID');
  }

  return commentId;
}

// ============================================================================
// DELETE — Soft-delete own comment (auth + CSRF required)
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const commentId = extractCommentId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const service = getContentInteractionService();
  const deleted = await service.deleteComment(commentId, user.id);

  if (!deleted) {
    throw BizError.notFound('Comment not found or you do not have permission to delete it');
  }

  return createSuccessResponse({ deleted: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
