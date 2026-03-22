/**
 * Content Analytics API Route
 * POST /api/content/[type]/[id]/analytics — Track content engagement events
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - No auth required: Anonymous tracking allowed
 * - No CSRF: Fire-and-forget analytics endpoint
 * - DatabaseService boundary: All DB operations via InternalAnalyticsService
 *
 * @authority CLAUDE.md - API Standards section
 * @reference src/app/api/content/[type]/[id]/bookmark/route.ts — URL extraction pattern
 * @phase Content Phase 3B
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getInternalAnalyticsService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import type { ContentType } from '@core/services/ContentInteractionService';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

const VALID_CONTENT_TYPES: ContentType[] = ['article', 'podcast', 'video', 'newsletter', 'guide'];

function extractParams(url: URL): { contentType: ContentType; contentId: number } {
  const segments = url.pathname.split('/');
  // /api/content/[type]/[id]/analytics → segments = ['', 'api', 'content', type, id, 'analytics']
  const analyticsIndex = segments.indexOf('analytics');
  if (analyticsIndex < 2) {
    throw BizError.badRequest('Invalid analytics URL structure');
  }

  const typeSegment = segments[analyticsIndex - 2] as ContentType;
  const idSegment = segments[analyticsIndex - 1];

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
// POST — Track analytics event
// ============================================================================

export const POST = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const { contentType, contentId } = extractParams(url);

  // Optional auth — attach user_id when available
  let userId: number | undefined;
  try {
    const user = await getUserFromRequest(context.request);
    if (user) {
      userId = user.id;
    }
  } catch {
    // Anonymous tracking — no auth required
  }

  const body = await context.request.json() as {
    metric_type?: string;
    content_type?: string;
    source?: string;
    platform?: string;
  };

  const metricType = body.metric_type || 'page_view';

  // Fire-and-forget via InternalAnalyticsService
  const analyticsService = getInternalAnalyticsService();
  analyticsService.trackEvent({
    eventName: `content_${metricType}`,
    eventData: {
      content_type: contentType,
      content_id: contentId,
      metric_type: metricType,
      ...(body.source && { source: body.source }),
      ...(body.platform && { platform: body.platform }),
    },
    ...(userId !== undefined && { userId }),
  }).catch(() => {
    // Silently fail — analytics never blocks response
  });

  return createSuccessResponse({ tracked: true }, context.requestId);
}, {
  allowedMethods: ['POST'],
});
