/**
 * Dashboard Listing Guides API Route
 * GET    /api/dashboard/listings/[listingId]/guides — List guides for a listing
 * POST   /api/dashboard/listings/[listingId]/guides — Create guide
 * PATCH  /api/dashboard/listings/[listingId]/guides — Update guide
 * DELETE /api/dashboard/listings/[listingId]/guides — Delete guide
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
 * @phase Tier 2 Content Types - Phase G8
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { GuideService } from '@core/services/GuideService';
import { GuideStatus } from '@core/types/guide';
import { getContentNotificationService } from '@core/services/notification/ContentNotificationService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/guides
  const guidesIndex = segments.indexOf('guides');
  if (guidesIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[guidesIndex - 1];
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
    throw BizError.forbidden('Creator Suite add-on required');
  }
}

// ============================================================================
// Helper: Get guide counts by status for a listing
// ============================================================================

interface GuideCounts {
  total: number;
  draft: number;
  published: number;
  archived: number;
}

async function getGuideCounts(listingId: number): Promise<GuideCounts> {
  const db = getDatabaseService();
  const result = await db.query<{ status: string; count: bigint | number }>(
    'SELECT status, COUNT(*) as count FROM content_guides WHERE listing_id = ? GROUP BY status',
    [listingId]
  );

  const counts: GuideCounts = { total: 0, draft: 0, published: 0, archived: 0 };

  for (const row of result.rows) {
    const n = bigIntToNumber(row.count);
    counts.total += n;
    if (row.status === 'draft') counts.draft = n;
    else if (row.status === 'published') counts.published = n;
    else if (row.status === 'archived') counts.archived = n;
  }

  return counts;
}

// ============================================================================
// Tier limits
// ============================================================================

const TIER_LIMITS: Record<string, number> = {
  essentials: 3,
  plus: 10,
  preferred: 30,
  premium: 9999,
};

// ============================================================================
// GET — List guides for a listing
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyCreatorSuite(listingId);

  const statusParam = url.searchParams.get('status');
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const guideService = new GuideService(getDatabaseService());

  const filters: { listing_id: number; status?: GuideStatus } = { listing_id: listingId };
  if (statusParam && Object.values(GuideStatus).includes(statusParam as GuideStatus)) {
    filters.status = statusParam as GuideStatus;
  }

  const result = await guideService.getGuides(filters, { page, pageSize: limit });
  const counts = await getGuideCounts(listingId);

  // Fetch section count per guide
  const db = getDatabaseService();
  const guidesWithSectionCount = await Promise.all(
    result.data.map(async (guide) => {
      const sectionCountResult = await db.query<{ cnt: bigint | number }>(
        'SELECT COUNT(*) as cnt FROM content_guide_sections WHERE guide_id = ?',
        [guide.id]
      );
      const section_count = bigIntToNumber(sectionCountResult.rows[0]?.cnt ?? 0);
      return { ...guide, section_count };
    })
  );

  return createSuccessResponse(
    { guides: guidesWithSectionCount, counts, pagination: result.pagination },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Create guide
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

  // Tier limit check
  const db = getDatabaseService();
  const tierResult = await db.query<{ tier: string }>(
    'SELECT tier FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  const tier = tierResult.rows[0]?.tier || 'essentials';
  const limit = TIER_LIMITS[tier] ?? 3;

  const countResult = await db.query<{ cnt: bigint | number }>(
    'SELECT COUNT(*) as cnt FROM content_guides WHERE listing_id = ?',
    [listingId]
  );
  const currentCount = bigIntToNumber(countResult.rows[0]?.cnt ?? 0);

  if (currentCount >= limit) {
    throw BizError.badRequest(`Guide limit reached for your tier (${limit} guides)`);
  }

  const body = await context.request.json() as Record<string, unknown>;

  const {
    title,
    subtitle,
    excerpt,
    overview,
    prerequisites,
    difficulty_level,
    estimated_time,
    featured_image,
    category_id,
    tags,
    version,
  } = body;

  if (!title || typeof title !== 'string') {
    throw BizError.badRequest('title is required');
  }

  // Parse tags: if string, split by comma; if array, use as-is
  let parsedTags: string[] | undefined;
  if (typeof tags === 'string') {
    parsedTags = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  } else if (Array.isArray(tags)) {
    parsedTags = tags as string[];
  }

  const guideService = new GuideService(getDatabaseService());
  const created = await guideService.createGuide({
    listing_id: listingId,
    title: title.trim(),
    subtitle: typeof subtitle === 'string' ? subtitle.trim() || undefined : undefined,
    excerpt: typeof excerpt === 'string' ? excerpt.trim() || undefined : undefined,
    overview: typeof overview === 'string' ? overview.trim() || undefined : undefined,
    prerequisites: typeof prerequisites === 'string' ? prerequisites.trim() || undefined : undefined,
    difficulty_level: typeof difficulty_level === 'string' ? difficulty_level as import('@core/types/guide').GuideDifficultyLevel : undefined,
    estimated_time: typeof estimated_time === 'number' ? estimated_time : (typeof estimated_time === 'string' && estimated_time ? parseInt(estimated_time, 10) : undefined),
    featured_image: typeof featured_image === 'string' ? featured_image.trim() || undefined : undefined,
    category_id: typeof category_id === 'number' ? category_id : (typeof category_id === 'string' && category_id ? parseInt(category_id, 10) : undefined),
    tags: parsedTags,
    version: typeof version === 'string' ? version.trim() || undefined : undefined,
  });

  return createSuccessResponse({ guide: created, message: 'Guide created successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update guide
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
  const { guideId, ...updateFields } = body;

  if (!guideId || typeof guideId !== 'number') {
    throw BizError.badRequest('guideId is required and must be a number');
  }

  // Verify guide belongs to this listing
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ listing_id: number; status: string }>(
    'SELECT listing_id, status FROM content_guides WHERE id = ? LIMIT 1',
    [guideId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Guide does not belong to this listing');
  }

  const wasPublished = ownershipRow.status === 'published';

  // If publishing, set published_at
  const updates: Record<string, unknown> = { ...updateFields };
  if (updates.status === 'published') {
    updates.published_at = new Date();
  }

  const guideService = new GuideService(getDatabaseService());
  const updated = await guideService.updateGuide(guideId, updates as Parameters<typeof guideService.updateGuide>[1]);

  // Fire publish notification when transitioning to published
  if (updates.status === 'published' && !wasPublished) {
    try {
      const cns = getContentNotificationService();
      cns.notifyContentPublished('guide', guideId, listingId);
    } catch {
      // Best-effort notification — do not fail the request
    }
  }

  // Fire content.guide_updated notification when editing a published guide
  if (wasPublished && updates.status !== 'draft' && updates.status !== 'archived') {
    try {
      const cns = getContentNotificationService();
      cns.notifyContentUpdated('guide', guideId, listingId);
    } catch {
      // Best-effort notification — do not fail the request
    }
  }

  return createSuccessResponse({ guide: updated, message: 'Guide updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete guide
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
  const { guideId } = body;

  if (!guideId || typeof guideId !== 'number') {
    throw BizError.badRequest('guideId is required and must be a number');
  }

  // Verify guide belongs to this listing
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_guides WHERE id = ? LIMIT 1',
    [guideId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Guide does not belong to this listing');
  }

  const guideService = new GuideService(getDatabaseService());
  await guideService.deleteGuide(guideId);

  return createSuccessResponse({ message: 'Guide deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
