/**
 * Dashboard Listing Content API Route
 * GET    /api/dashboard/listings/[listingId]/content — List content for a listing
 * POST   /api/dashboard/listings/[listingId]/content — Create content item
 * PATCH  /api/dashboard/listings/[listingId]/content — Update content item
 * DELETE /api/dashboard/listings/[listingId]/content — Delete content item
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, PATCH, DELETE)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership validation on all operations
 * - Creator Suite add-on validation on create operations
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Content Phase 5A
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getContentService } from '@core/services/ServiceRegistry';
import { getContentNotificationService } from '@core/services/notification/ContentNotificationService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import type { ContentStatus } from '@core/services/ContentService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/content
  const contentIndex = segments.indexOf('content');
  if (contentIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[contentIndex - 1];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) {
    throw BizError.badRequest('Invalid listing ID');
  }
  return id;
}

// ============================================================================
// Helper: Verify user owns the listing
// ============================================================================

async function verifyListingOwnership(listingId: number, userId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const row = result.rows[0];
  if (!result.rows.length || !row || row.user_id !== userId) {
    throw BizError.forbidden('Not your listing');
  }
}

// ============================================================================
// Helper: Verify Creator Suite add-on is active
// ============================================================================

async function verifyCreatorSuite(listingId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ id: number }>(
    `SELECT lsa.id
     FROM listing_subscription_addons lsa
     JOIN listing_subscriptions ls ON lsa.listing_subscription_id = ls.id
     JOIN addon_suites as2 ON lsa.addon_suite_id = as2.id
     WHERE ls.listing_id = ?
       AND as2.suite_name = 'creator'
       AND lsa.status = 'active'
     LIMIT 1`,
    [listingId]
  );
  if (!result.rows.length) {
    throw BizError.forbidden('Creator Suite add-on required to create content');
  }
}

// ============================================================================
// Helper: Verify content belongs to listing
// ============================================================================

async function verifyContentOwnership(
  contentType: 'article' | 'podcast' | 'video',
  contentId: number,
  listingId: number
): Promise<void> {
  const tableMap: Record<string, string> = {
    article: 'content_articles',
    podcast: 'content_podcasts',
    video: 'content_videos',
  };
  const table = tableMap[contentType];
  const db = getDatabaseService();
  const result = await db.query<{ listing_id: number | null }>(
    `SELECT listing_id FROM ${table} WHERE id = ? LIMIT 1`,
    [contentId]
  );
  const row = result.rows[0];
  if (!result.rows.length || !row || row.listing_id !== listingId) {
    throw BizError.forbidden('Content does not belong to this listing');
  }
}

// ============================================================================
// Helper: Get counts for all content types for a listing
// ============================================================================

async function getContentCounts(listingId: number): Promise<{ articles: number; podcasts: number; videos: number }> {
  const db = getDatabaseService();
  const [articlesResult, podcastsResult, videosResult] = await Promise.all([
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) AS cnt FROM content_articles WHERE listing_id = ?',
      [listingId]
    ),
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) AS cnt FROM content_podcasts WHERE listing_id = ?',
      [listingId]
    ),
    db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) AS cnt FROM content_videos WHERE listing_id = ?',
      [listingId]
    ),
  ]);
  return {
    articles: bigIntToNumber(articlesResult.rows[0]?.cnt ?? 0),
    podcasts: bigIntToNumber(podcastsResult.rows[0]?.cnt ?? 0),
    videos: bigIntToNumber(videosResult.rows[0]?.cnt ?? 0),
  };
}

// ============================================================================
// GET — List content for a listing
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const type = url.searchParams.get('type') || 'articles';
  const statusParam = url.searchParams.get('status') as ContentStatus | null;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const contentService = getContentService();
  const filters = {
    listingId,
    ...(statusParam ? { status: statusParam } : {}),
  };
  const pagination = { page, pageSize };

  let items;
  let pagination_result;

  if (type === 'videos') {
    const result = await contentService.getVideos(filters, pagination);
    items = result.data;
    pagination_result = result.pagination;
  } else if (type === 'podcasts') {
    const result = await contentService.getPodcasts(filters, pagination);
    items = result.data;
    pagination_result = result.pagination;
  } else {
    const result = await contentService.getArticles(filters, pagination);
    items = result.data;
    pagination_result = result.pagination;
  }

  const counts = await getContentCounts(listingId);

  return createSuccessResponse(
    { [type]: items, pagination: pagination_result, counts },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Create content item
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyCreatorSuite(listingId);

  const body = await context.request.json() as Record<string, unknown>;
  const { contentType, ...fields } = body;

  if (!contentType || !['article', 'podcast', 'video'].includes(contentType as string)) {
    throw BizError.badRequest('contentType must be article, podcast, or video');
  }

  const contentService = getContentService();
  let createdItem;

  if (contentType === 'article') {
    createdItem = await contentService.createArticle({
      ...(fields as Record<string, unknown>),
      listing_id: listingId,
    } as Parameters<typeof contentService.createArticle>[0]);
  } else if (contentType === 'podcast') {
    createdItem = await contentService.createPodcast({
      ...(fields as Record<string, unknown>),
      listing_id: listingId,
    } as Parameters<typeof contentService.createPodcast>[0]);
  } else {
    createdItem = await contentService.createVideo({
      ...(fields as Record<string, unknown>),
      listing_id: listingId,
    } as Parameters<typeof contentService.createVideo>[0]);
  }

  return createSuccessResponse({ item: createdItem }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update content item (status change triggers notification)
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const body = await context.request.json() as Record<string, unknown>;
  const { contentType, contentId, ...updateFields } = body;

  if (!contentType || !['article', 'podcast', 'video'].includes(contentType as string)) {
    throw BizError.badRequest('contentType must be article, podcast, or video');
  }
  if (!contentId || typeof contentId !== 'number') {
    throw BizError.badRequest('contentId is required and must be a number');
  }

  await verifyContentOwnership(contentType as 'article' | 'podcast' | 'video', contentId, listingId);

  const contentService = getContentService();
  const isPublishing = updateFields.status === 'published';
  let updatedItem;

  if (contentType === 'article') {
    if (isPublishing) {
      updatedItem = await contentService.publishArticle(contentId);
    } else {
      updatedItem = await contentService.updateArticle(
        contentId,
        updateFields as Parameters<typeof contentService.updateArticle>[1]
      );
    }
  } else if (contentType === 'podcast') {
    if (isPublishing) {
      updatedItem = await contentService.publishPodcast(contentId);
    } else {
      updatedItem = await contentService.updatePodcast(
        contentId,
        updateFields as Parameters<typeof contentService.updatePodcast>[1]
      );
    }
  } else {
    if (isPublishing) {
      updatedItem = await contentService.publishVideo(contentId);
    } else {
      updatedItem = await contentService.updateVideo(
        contentId,
        updateFields as Parameters<typeof contentService.updateVideo>[1]
      );
    }
  }

  // Trigger publish notification (best-effort, non-blocking)
  if (isPublishing) {
    getContentNotificationService()
      .notifyContentPublished(contentType as 'article' | 'podcast' | 'video', contentId, listingId)
      .catch(() => {
        // Non-blocking — notification failure should not fail the request
      });
  }

  return createSuccessResponse({ item: updatedItem }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete content item
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const body = await context.request.json() as Record<string, unknown>;
  const { contentType, contentId } = body;

  if (!contentType || !['article', 'podcast', 'video'].includes(contentType as string)) {
    throw BizError.badRequest('contentType must be article, podcast, or video');
  }
  if (!contentId || typeof contentId !== 'number') {
    throw BizError.badRequest('contentId is required and must be a number');
  }

  await verifyContentOwnership(contentType as 'article' | 'podcast' | 'video', contentId, listingId);

  const contentService = getContentService();

  if (contentType === 'article') {
    await contentService.deleteArticle(contentId);
  } else if (contentType === 'podcast') {
    await contentService.deletePodcast(contentId);
  } else {
    await contentService.deleteVideo(contentId);
  }

  return createSuccessResponse({ deleted: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
