/**
 * Admin Content Comments Moderation API Route
 * GET   /api/admin/content/comments — List comments for moderation
 * PATCH /api/admin/content/comments — Hide or unhide a comment
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for state-changing operations (PATCH)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - bigIntToNumber: ALL COUNT(*) queries
 * - AdminActivityService logging on all admin actions
 *
 * @authority CLAUDE.md - API Standards
 * @phase Content Phase 4A
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';

// ============================================================================
// Types
// ============================================================================

interface CommentRow {
  id: number;
  content_type: string;
  content_id: number;
  user_id: number;
  parent_id: number | null;
  comment_text: string;
  status: string;
  is_edited: boolean | number;
  created_at: Date | string;
  updated_at: Date | string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface CountRow {
  count: bigint | number;
}

// ============================================================================
// GET /api/admin/content/comments
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin content comments', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const content_type = searchParams.get('content_type');
  const status = searchParams.get('status') || 'active';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const db = getDatabaseService();

  // Build WHERE clause
  const whereConditions: string[] = ['cc.status = ?'];
  const params: (string | number)[] = [status];

  if (content_type) {
    whereConditions.push('cc.content_type = ?');
    params.push(content_type);
  }

  const whereClause = whereConditions.join(' AND ');

  // Fetch comments with user data
  const commentsResult = await db.query<CommentRow>(
    `SELECT cc.*, u.first_name, u.last_name, COALESCE(u.email, '') as email, u.avatar_url
     FROM content_comments cc
     LEFT JOIN users u ON cc.user_id = u.id
     WHERE ${whereClause}
     ORDER BY cc.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Count total
  const countResult = await db.query<CountRow>(
    `SELECT COUNT(*) as count
     FROM content_comments cc
     WHERE ${whereClause}`,
    params
  );

  const total = bigIntToNumber(countResult.rows?.[0]?.count ?? 0);

  return createSuccessResponse({
    comments: commentsResult.rows ?? [],
    pagination: {
      page,
      pageSize: limit,
      total,
    },
  });
});

// ============================================================================
// PATCH /api/admin/content/comments — Hide or unhide a comment
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('moderate content comments', 'admin');
  }

  const body = await request.json() as {
    commentId: number;
    action: 'hide' | 'unhide';
  };

  const { commentId, action } = body;

  if (!commentId || !action) {
    throw BizError.badRequest('commentId and action are required');
  }

  if (!['hide', 'unhide'].includes(action)) {
    throw BizError.badRequest('action must be hide or unhide');
  }

  const newStatus = action === 'hide' ? 'hidden' : 'active';

  const db = getDatabaseService();
  const adminActivityService = getAdminActivityService();

  await db.query(
    'UPDATE content_comments SET status = ? WHERE id = ?',
    [newStatus, commentId]
  );

  // Log admin activity (non-blocking)
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'content_comment',
    targetEntityId: commentId,
    actionType: `comment_${action}`,
    actionCategory: 'moderation',
    actionDescription: `Admin ${action === 'hide' ? 'hid' : 'unhid'} comment #${commentId}`,
    severity: 'normal',
  });

  return createSuccessResponse({ commentId, status: newStatus });
}));
