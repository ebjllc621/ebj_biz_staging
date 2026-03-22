/**
 * Guide Progress API Routes
 * GET  /api/content/guides/[slug]/progress — Get user's progress on a guide
 * POST /api/content/guides/[slug]/progress — Mark/unmark section complete
 *
 * @authority CLAUDE.md - API Standards
 * @tier STANDARD
 * @phase Phase G4 - Progress Tracking
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { GuideService, GuideNotFoundError } from '@core/services/GuideService';
import { getDatabaseService, getInternalAnalyticsService } from '@core/services/ServiceRegistry';

// GET — Fetch user's progress on a guide
export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  // /api/content/guides/[slug]/progress → ['', 'api', 'content', 'guides', slug, 'progress']
  const slug = segments[4];

  if (!slug) {
    throw BizError.badRequest('Guide slug is required');
  }

  const db = getDatabaseService();
  const guideService = new GuideService(db);

  const guide = await guideService.getGuideBySlug(slug);
  if (!guide) {
    throw new GuideNotFoundError(slug);
  }

  const userId = parseInt(context.userId!, 10);
  const progress = await guideService.getProgress(guide.id, userId);

  return createSuccessResponse({
    progress: progress || {
      guide_id: guide.id,
      user_id: userId,
      completed_sections: [],
      is_completed: false,
      section_id: null,
      started_at: null,
      completed_at: null,
      last_accessed_at: null
    }
  }, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

// POST — Mark/unmark section, update last accessed
export const POST = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const slug = segments[4];

  if (!slug) {
    throw BizError.badRequest('Guide slug is required');
  }

  const body = await context.request.json() as {
    action: 'mark_section' | 'unmark_section' | 'update_last_accessed';
    section_id: number;
  };

  if (!body.action) {
    throw BizError.badRequest('Action is required (mark_section, unmark_section, update_last_accessed)');
  }

  if (!body.section_id || typeof body.section_id !== 'number') {
    throw BizError.badRequest('section_id is required and must be a number');
  }

  const db = getDatabaseService();
  const guideService = new GuideService(db);

  const guide = await guideService.getGuideBySlug(slug);
  if (!guide) {
    throw new GuideNotFoundError(slug);
  }

  const userId = parseInt(context.userId!, 10);
  let progress;

  switch (body.action) {
    case 'mark_section': {
      progress = await guideService.markSectionComplete(guide.id, userId, body.section_id);

      // Analytics: track progress milestone (fire-and-forget)
      const totalSections = guide.sections?.length || 0;
      if (totalSections > 0) {
        const percentComplete = Math.round((progress.completed_sections.length / totalSections) * 100);
        const analyticsService = getInternalAnalyticsService();
        analyticsService.trackEvent({
          eventName: 'guide_progress',
          eventData: {
            guide_id: guide.id,
            section_id: body.section_id,
            percent_complete: percentComplete,
            sections_completed: progress.completed_sections.length,
            total_sections: totalSections
          },
          userId: userId
        }).catch(() => { /* fire-and-forget */ });

        // Track guide_complete event separately
        if (progress.is_completed) {
          analyticsService.trackEvent({
            eventName: 'guide_complete',
            eventData: {
              guide_id: guide.id,
              total_sections: totalSections
            },
            userId: userId
          }).catch(() => { /* fire-and-forget */ });
        }
      }
      break;
    }

    case 'unmark_section':
      progress = await guideService.unmarkSectionComplete(guide.id, userId, body.section_id);
      break;

    case 'update_last_accessed':
      await guideService.updateLastAccessed(guide.id, userId, body.section_id);
      progress = await guideService.getProgress(guide.id, userId);
      break;

    default:
      throw BizError.badRequest(`Invalid action: ${body.action}`);
  }

  return createSuccessResponse({ progress }, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
