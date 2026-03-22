/**
 * Admin Content Action API Route
 * PATCH /api/admin/content/[type]/[id] — Update content item
 * DELETE /api/admin/content/[type]/[id] — Delete content item
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for state-changing operations (PATCH, DELETE)
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - DatabaseService boundary compliance
 * - AdminActivityService logging on all admin actions
 *
 * @authority CLAUDE.md - API Standards
 * @phase Content Phase 4A
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getContentService } from '@core/services/ServiceRegistry';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { withCsrf } from '@/lib/security/withCsrf';
import { ContentStatus } from '@core/services/ContentService';

// ============================================================================
// URL Parameter Extraction
// ============================================================================

const VALID_CONTENT_TYPES = ['article', 'articles', 'podcast', 'podcasts', 'video', 'videos'];

function extractParams(url: URL): { contentType: string; contentId: number } {
  const segments = url.pathname.split('/');
  // /api/admin/content/[type]/[id]
  const contentIndex = segments.indexOf('content') + 1;
  const contentType = segments[contentIndex] ?? '';
  const contentId = parseInt(segments[contentIndex + 1] ?? '', 10);

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    throw BizError.badRequest(`Invalid content type: ${contentType}`);
  }

  if (isNaN(contentId) || contentId <= 0) {
    throw BizError.badRequest('Invalid content ID');
  }

  return { contentType, contentId };
}

// Normalize plural or singular type to singular for service calls
function toSingularType(type: string): 'article' | 'podcast' | 'video' {
  if (type === 'articles' || type === 'article') return 'article';
  if (type === 'podcasts' || type === 'podcast') return 'podcast';
  if (type === 'videos' || type === 'video') return 'video';
  throw BizError.badRequest(`Unknown content type: ${type}`);
}

// ============================================================================
// GET — Fetch individual content item for editing
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('read admin content', 'admin');
  }

  const url = new URL(request.url);
  const { contentType, contentId } = extractParams(url);
  const singularType = toSingularType(contentType);

  const contentService = getContentService();

  let item;
  if (singularType === 'article') {
    item = await contentService.getArticleById(contentId);
  } else if (singularType === 'podcast') {
    item = await contentService.getPodcastById(contentId);
  } else {
    item = await contentService.getVideoById(contentId);
  }

  if (!item) {
    throw BizError.notFound(`${singularType} not found`);
  }

  return createSuccessResponse({ [singularType]: item });
});

// ============================================================================
// PATCH — Update content item
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('update admin content', 'admin');
  }

  const url = new URL(request.url);
  const { contentType, contentId } = extractParams(url);
  const singularType = toSingularType(contentType);

  const body = await request.json() as {
    status?: string;
    is_featured?: boolean;
    is_sponsored?: boolean;
  };

  const contentService = getContentService();
  const adminActivityService = getAdminActivityService();

  let updatedItem;

  if (singularType === 'article') {
    const updateData: { status?: ContentStatus; is_featured?: boolean; is_sponsored?: boolean } = {};
    if (body.status) updateData.status = body.status as ContentStatus;
    if (typeof body.is_featured === 'boolean') updateData.is_featured = body.is_featured;
    if (typeof body.is_sponsored === 'boolean') updateData.is_sponsored = body.is_sponsored;
    updatedItem = await contentService.updateArticle(contentId, updateData);
  } else if (singularType === 'podcast') {
    const updateData: { status?: ContentStatus; is_featured?: boolean; is_sponsored?: boolean } = {};
    if (body.status) updateData.status = body.status as ContentStatus;
    if (typeof body.is_featured === 'boolean') updateData.is_featured = body.is_featured;
    if (typeof body.is_sponsored === 'boolean') updateData.is_sponsored = body.is_sponsored;
    updatedItem = await contentService.updatePodcast(contentId, updateData);
  } else {
    const updateData: { status?: ContentStatus; is_featured?: boolean; is_sponsored?: boolean } = {};
    if (body.status) updateData.status = body.status as ContentStatus;
    if (typeof body.is_featured === 'boolean') updateData.is_featured = body.is_featured;
    if (typeof body.is_sponsored === 'boolean') updateData.is_sponsored = body.is_sponsored;
    updatedItem = await contentService.updateVideo(contentId, updateData);
  }

  // Log admin activity (non-blocking)
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: singularType,
    targetEntityId: contentId,
    actionType: 'content_status_update',
    actionCategory: 'moderation',
    actionDescription: `Admin updated ${singularType} #${contentId}`,
    afterData: body as Record<string, unknown>,
    severity: 'normal',
  });

  return createSuccessResponse({ item: updatedItem });
}));

// ============================================================================
// DELETE — Delete content item
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('delete admin content', 'admin');
  }

  const url = new URL(request.url);
  const { contentType, contentId } = extractParams(url);
  const singularType = toSingularType(contentType);

  const hardDelete = url.searchParams.get('hard') === 'true';

  const contentService = getContentService();
  const adminActivityService = getAdminActivityService();

  if (hardDelete) {
    // Hard delete
    if (singularType === 'article') {
      await contentService.deleteArticle(contentId);
    } else if (singularType === 'podcast') {
      await contentService.deletePodcast(contentId);
    } else {
      await contentService.deleteVideo(contentId);
    }
  } else {
    // Soft delete — archive by setting status to archived
    if (singularType === 'article') {
      await contentService.updateArticle(contentId, { status: ContentStatus.ARCHIVED });
    } else if (singularType === 'podcast') {
      await contentService.updatePodcast(contentId, { status: ContentStatus.ARCHIVED });
    } else {
      await contentService.updateVideo(contentId, { status: ContentStatus.ARCHIVED });
    }
  }

  // Log admin activity (non-blocking)
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: singularType,
    targetEntityId: contentId,
    actionType: hardDelete ? 'content_hard_delete' : 'content_soft_delete',
    actionCategory: 'deletion',
    actionDescription: `Admin ${hardDelete ? 'permanently deleted' : 'archived'} ${singularType} #${contentId}`,
    severity: hardDelete ? 'high' : 'normal',
  });

  return createSuccessResponse({ deleted: true });
}));
