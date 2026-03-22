/**
 * Dashboard Listing Newsletters API Route
 * GET    /api/dashboard/listings/[listingId]/newsletters — List newsletters for a listing
 * POST   /api/dashboard/listings/[listingId]/newsletters — Create newsletter
 * PATCH  /api/dashboard/listings/[listingId]/newsletters — Update newsletter
 * DELETE /api/dashboard/listings/[listingId]/newsletters — Delete newsletter
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
 * @phase Tier 2 Content Types - Phase N7A
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { NewsletterService } from '@core/services/NewsletterService';
import { NewsletterStatus } from '@core/types/newsletter';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/newsletters
  const newslettersIndex = segments.indexOf('newsletters');
  if (newslettersIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[newslettersIndex - 1];
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
// Helper: Get newsletter counts by status for a listing
// ============================================================================

interface NewsletterCounts {
  total: number;
  draft: number;
  published: number;
  scheduled: number;
  archived: number;
}

async function getNewsletterCounts(listingId: number): Promise<NewsletterCounts> {
  const db = getDatabaseService();
  const result = await db.query<{ status: string; count: bigint | number }>(
    'SELECT status, COUNT(*) as count FROM content_newsletters WHERE listing_id = ? GROUP BY status',
    [listingId]
  );

  const counts: NewsletterCounts = { total: 0, draft: 0, published: 0, scheduled: 0, archived: 0 };

  for (const row of result.rows) {
    const n = bigIntToNumber(row.count);
    counts.total += n;
    if (row.status === 'draft') counts.draft = n;
    else if (row.status === 'published') counts.published = n;
    else if (row.status === 'scheduled') counts.scheduled = n;
    else if (row.status === 'archived') counts.archived = n;
  }

  return counts;
}

// ============================================================================
// Tier limits
// ============================================================================

const TIER_LIMITS: Record<string, number> = {
  essentials: 5,
  plus: 15,
  preferred: 50,
  premium: 9999,
};

// ============================================================================
// GET — List newsletters for a listing
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

  const newsletterService = new NewsletterService(getDatabaseService());

  const filters: { listing_id: number; status?: NewsletterStatus } = { listing_id: listingId };
  if (statusParam && Object.values(NewsletterStatus).includes(statusParam as NewsletterStatus)) {
    filters.status = statusParam as NewsletterStatus;
  }

  const result = await newsletterService.getNewsletters(filters, { page, pageSize: limit });
  const counts = await getNewsletterCounts(listingId);
  const subscriberCount = await newsletterService.getSubscriberCount(listingId);

  return createSuccessResponse(
    { newsletters: result.data, counts, pagination: result.pagination, subscriberCount },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Create newsletter
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
  const limit = TIER_LIMITS[tier] ?? 5;

  const countResult = await db.query<{ cnt: bigint | number }>(
    'SELECT COUNT(*) as cnt FROM content_newsletters WHERE listing_id = ?',
    [listingId]
  );
  const currentCount = bigIntToNumber(countResult.rows[0]?.cnt ?? 0);

  if (currentCount >= limit) {
    throw BizError.badRequest(`Newsletter limit reached for your tier (${limit} newsletters)`);
  }

  const body = await context.request.json() as Record<string, unknown>;

  const {
    title,
    excerpt,
    web_content,
    email_html,
    featured_image,
    category_id,
    tags,
    reading_time,
    issue_number,
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

  const newsletterService = new NewsletterService(getDatabaseService());
  const created = await newsletterService.createNewsletter({
    listing_id: listingId,
    title: title.trim(),
    excerpt: typeof excerpt === 'string' ? excerpt.trim() || undefined : undefined,
    web_content: typeof web_content === 'string' ? web_content.trim() || undefined : undefined,
    email_html: typeof email_html === 'string' ? email_html.trim() || undefined : undefined,
    featured_image: typeof featured_image === 'string' ? featured_image.trim() || undefined : undefined,
    category_id: typeof category_id === 'number' ? category_id : (typeof category_id === 'string' && category_id ? parseInt(category_id, 10) : undefined),
    tags: parsedTags,
    reading_time: typeof reading_time === 'number' ? reading_time : (typeof reading_time === 'string' && reading_time ? parseInt(reading_time, 10) : undefined),
    issue_number: typeof issue_number === 'number' ? issue_number : (typeof issue_number === 'string' && issue_number ? parseInt(issue_number, 10) : undefined),
  });

  return createSuccessResponse({ newsletter: created, message: 'Newsletter created successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update newsletter
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
  const { newsletterId, ...updateFields } = body;

  if (!newsletterId || typeof newsletterId !== 'number') {
    throw BizError.badRequest('newsletterId is required and must be a number');
  }

  // Verify newsletter belongs to this listing
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_newsletters WHERE id = ? LIMIT 1',
    [newsletterId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Newsletter does not belong to this listing');
  }

  // If publishing, set published_at
  const updates: Record<string, unknown> = { ...updateFields };
  if (updates.status === 'published') {
    updates.published_at = new Date();
  }

  const newsletterService = new NewsletterService(getDatabaseService());
  const updated = await newsletterService.updateNewsletter(newsletterId, updates as Parameters<typeof newsletterService.updateNewsletter>[1]);

  return createSuccessResponse({ newsletter: updated, message: 'Newsletter updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete newsletter
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
  const { newsletterId } = body;

  if (!newsletterId || typeof newsletterId !== 'number') {
    throw BizError.badRequest('newsletterId is required and must be a number');
  }

  // Verify newsletter belongs to this listing
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_newsletters WHERE id = ? LIMIT 1',
    [newsletterId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.listing_id !== listingId) {
    throw BizError.forbidden('Newsletter does not belong to this listing');
  }

  const newsletterService = new NewsletterService(getDatabaseService());
  await newsletterService.deleteNewsletter(newsletterId);

  return createSuccessResponse({ message: 'Newsletter deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
