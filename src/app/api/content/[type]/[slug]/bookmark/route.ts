/**
 * Content Bookmark API Route
 * GET    /api/content/[type]/[id]/bookmark — Check bookmark state
 * POST   /api/content/[type]/[id]/bookmark — Toggle bookmark (add/remove)
 * DELETE /api/content/[type]/[id]/bookmark — Remove bookmark
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, DELETE)
 * - requireAuth: true (must be authenticated to bookmark)
 * - DatabaseService boundary: All DB operations via service layer
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Content Phase 3A
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getContentInteractionService } from '@core/services/ContentInteractionService';
import { withCsrf } from '@/lib/security/withCsrf';
import type { ContentType } from '@core/services/ContentInteractionService';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

const VALID_CONTENT_TYPES: ContentType[] = ['article', 'podcast', 'video'];

function extractParams(url: URL): { contentType: ContentType; contentId: number } {
  const segments = url.pathname.split('/');
  // /api/content/[type]/[id]/bookmark → segments = ['', 'api', 'content', type, id, 'bookmark']
  const bookmarkIndex = segments.indexOf('bookmark');
  if (bookmarkIndex < 2) {
    throw BizError.badRequest('Invalid bookmark URL structure');
  }

  const typeSegment = segments[bookmarkIndex - 2] as ContentType;
  const idSegment = segments[bookmarkIndex - 1];

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
// GET — Check bookmark state
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const service = getContentInteractionService();
  const [bookmarked, count] = await Promise.all([
    service.isBookmarked(user.id, contentType, contentId),
    service.getBookmarkCount(contentType, contentId),
  ]);

  return createSuccessResponse({ bookmarked, count }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Toggle bookmark (add or remove via toggle)
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const service = getContentInteractionService();
  const result = await service.toggleBookmark(user.id, contentType, contentId);
  const count = await service.getBookmarkCount(contentType, contentId);

  return createSuccessResponse({ bookmarked: result.bookmarked, count }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// DELETE — Remove bookmark
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const service = getContentInteractionService();

  // Check if bookmarked first; if not bookmarked, DELETE is still a success (idempotent)
  const isBookmarked = await service.isBookmarked(user.id, contentType, contentId);
  if (isBookmarked) {
    await service.toggleBookmark(user.id, contentType, contentId);
  }

  const count = await service.getBookmarkCount(contentType, contentId);

  return createSuccessResponse({ bookmarked: false, count }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
