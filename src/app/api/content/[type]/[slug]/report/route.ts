/**
 * Content Report API Route
 * POST /api/content/[type]/[id]/report — Submit a user report for a content item
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations
 * - requireAuth: true (must be authenticated to report)
 * - DatabaseService boundary: All DB operations via service layer
 * - Rate limiting: One report per user per content item enforced via admin_activity
 *
 * @authority CLAUDE.md - API Standards section
 * @reference src/app/api/events/[id]/report/route.ts — CANONICAL pattern
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
const VALID_REASONS = ['spam', 'inappropriate', 'misleading', 'safety', 'other'];

function extractParams(url: URL): { contentType: ContentType; contentId: number } {
  const segments = url.pathname.split('/');
  // /api/content/[type]/[id]/report → segments = ['', 'api', 'content', type, id, 'report']
  const reportIndex = segments.indexOf('report');
  if (reportIndex < 2) {
    throw BizError.badRequest('Invalid report URL structure');
  }

  const typeSegment = segments[reportIndex - 2] as ContentType;
  const idSegment = segments[reportIndex - 1];

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
// POST — Submit report
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  // Require authentication
  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required to report content');
  }

  // Parse and validate request body
  const body = await context.request.json();
  const { reason, details } = body as { reason?: string; details?: string };

  if (!reason || !VALID_REASONS.includes(reason)) {
    throw BizError.badRequest('A valid report reason is required');
  }

  // Delegate to ContentInteractionService (handles duplicate check + logging)
  const service = getContentInteractionService();

  try {
    await service.submitReport(user.id, user.email, contentType, contentId, reason, details);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('already reported')) {
        throw BizError.badRequest('You have already reported this content');
      }
      if (err.message.includes('not found')) {
        throw BizError.notFound('Content not found');
      }
    }
    throw err;
  }

  return createSuccessResponse({ reported: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
