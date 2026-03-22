/**
 * Content Comments API Route
 * GET  /api/content/[type]/[id]/comments?page=1&pageSize=20 — Get paginated comments
 * POST /api/content/[type]/[id]/comments — Add a comment (auth + CSRF required)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST)
 * - GET is public — no auth required for reading comments
 * - POST requires auth: getUserFromRequest()
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
import { getContentNotificationService } from '@core/services/notification/ContentNotificationService';
import { withCsrf } from '@/lib/security/withCsrf';
import type { ContentType } from '@core/services/ContentInteractionService';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

const VALID_CONTENT_TYPES: ContentType[] = ['article', 'podcast', 'video'];

function extractParams(url: URL): { contentType: ContentType; contentId: number } {
  const segments = url.pathname.split('/');
  // /api/content/[type]/[id]/comments → segments = ['', 'api', 'content', type, id, 'comments']
  const commentsIndex = segments.indexOf('comments');
  if (commentsIndex < 2) {
    throw BizError.badRequest('Invalid comments URL structure');
  }

  const typeSegment = segments[commentsIndex - 2] as ContentType;
  const idSegment = segments[commentsIndex - 1];

  if (!VALID_CONTENT_TYPES.includes(typeSegment)) {
    throw BizError.badRequest(`Invalid content type: ${typeSegment}. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
  }

  const contentId = parseInt(idSegment ?? '');
  if (!idSegment || isNaN(contentId)) {
    throw BizError.badRequest('Invalid content ID');
  }

  return { contentType: typeSegment, contentId };
}

// ============================================================================
// GET — Fetch paginated comments (public)
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20')));

  const service = getContentInteractionService();
  const { comments, total } = await service.getComments(contentType, contentId, page, pageSize);

  const hasMore = page * pageSize < total;

  return createSuccessResponse(
    { comments, total, page, pageSize, hasMore },
    context.requestId
  );
}, {
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Add a comment (auth + CSRF required)
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to comment');
  }

  const body = await context.request.json() as {
    text?: string;
    parentId?: number;
  };

  const text = body.text?.trim() ?? '';
  if (!text || text.length < 1) {
    throw BizError.badRequest('Comment text is required');
  }
  if (text.length > 2000) {
    throw BizError.badRequest('Comment text must be 2000 characters or fewer');
  }

  const parentId = typeof body.parentId === 'number' ? body.parentId : undefined;

  const service = getContentInteractionService();
  const comment = await service.addComment(user.id, contentType, contentId, text, parentId);

  // Fire-and-forget notification to content owner
  getContentNotificationService()
    .notifyCommentReceived(contentType, contentId, user.id)
    .catch(() => { /* silently fail */ });

  return createSuccessResponse({ comment }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
