/**
 * Dashboard Listing Guide Sections API Route
 * GET    /api/dashboard/listings/[listingId]/guides/[guideId]/sections — List sections for a guide
 * POST   /api/dashboard/listings/[listingId]/guides/[guideId]/sections — Add section
 * PATCH  /api/dashboard/listings/[listingId]/guides/[guideId]/sections — Update or reorder sections
 * DELETE /api/dashboard/listings/[listingId]/guides/[guideId]/sections — Delete section
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, PATCH, DELETE)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership + guide ownership validation on all operations
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Tier 2 Content Types - Phase G8
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { GuideService } from '@core/services/GuideService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/guides/[guideId]/sections
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
// Helper: Extract and validate guideId from URL
// ============================================================================

function extractGuideId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/guides/[guideId]/sections
  const sectionsIndex = segments.indexOf('sections');
  if (sectionsIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[sectionsIndex - 1];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) {
    throw BizError.badRequest('Invalid guide ID');
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
// Helper: Verify guide belongs to listing
// ============================================================================

async function verifyGuideOwnership(guideId: number, listingId: number): Promise<void> {
  const db = getDatabaseService();
  const result = await db.query<{ listing_id: number }>(
    'SELECT listing_id FROM content_guides WHERE id = ? LIMIT 1',
    [guideId]
  );
  const row = result.rows[0];
  if (!result.rows.length || !row || row.listing_id !== listingId) {
    throw BizError.forbidden('Guide does not belong to this listing');
  }
}

// ============================================================================
// Helper: Recalculate word count for a guide from its sections
// ============================================================================

async function recalculateWordCount(guideId: number): Promise<void> {
  const db = getDatabaseService();
  const sectionsResult = await db.query<{ content: string | null }>(
    'SELECT content FROM content_guide_sections WHERE guide_id = ?',
    [guideId]
  );
  const totalWords = sectionsResult.rows.reduce((sum, row) => {
    if (!row.content) return sum;
    return sum + row.content.trim().split(/\s+/).filter(Boolean).length;
  }, 0);
  await db.query('UPDATE content_guides SET word_count = ? WHERE id = ?', [totalWords, guideId]);
}

// ============================================================================
// GET — List sections for a guide
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);
  const guideId = extractGuideId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyGuideOwnership(guideId, listingId);

  const db = getDatabaseService();
  const result = await db.query<{
    id: number;
    guide_id: number;
    section_number: number;
    title: string;
    slug: string | null;
    content: string | null;
    estimated_time: number | null;
    sort_order: number;
    created_at: string;
    updated_at: string | null;
  }>(
    'SELECT * FROM content_guide_sections WHERE guide_id = ? ORDER BY sort_order ASC',
    [guideId]
  );

  return createSuccessResponse({ sections: result.rows }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Add section to a guide
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);
  const guideId = extractGuideId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyGuideOwnership(guideId, listingId);

  const body = await context.request.json() as Record<string, unknown>;
  const { title, content, estimated_time } = body;

  if (!title || typeof title !== 'string') {
    throw BizError.badRequest('title is required');
  }

  const guideService = new GuideService(getDatabaseService());
  const section = await guideService.addSection(guideId, {
    title: title.trim(),
    content: typeof content === 'string' ? content.trim() || undefined : undefined,
    estimated_time: typeof estimated_time === 'number' ? estimated_time : (typeof estimated_time === 'string' && estimated_time ? parseInt(estimated_time, 10) : undefined),
  });

  await recalculateWordCount(guideId);

  return createSuccessResponse({ section, message: 'Section added successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update section or reorder sections
// ============================================================================

export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);
  const guideId = extractGuideId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyGuideOwnership(guideId, listingId);

  const body = await context.request.json() as Record<string, unknown>;

  if (body.reorder === true) {
    // Reorder sections
    const { sectionIds } = body;
    if (!Array.isArray(sectionIds) || !sectionIds.every((id: unknown) => typeof id === 'number')) {
      throw BizError.badRequest('sectionIds must be an array of numbers');
    }

    const guideService = new GuideService(getDatabaseService());
    await guideService.reorderSections(guideId, sectionIds as number[]);

    return createSuccessResponse({ message: 'Sections reordered successfully' }, context.requestId);
  }

  // Update single section
  const { sectionId, ...updateFields } = body;

  if (!sectionId || typeof sectionId !== 'number') {
    throw BizError.badRequest('sectionId is required and must be a number');
  }

  // Verify section belongs to this guide
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ guide_id: number }>(
    'SELECT guide_id FROM content_guide_sections WHERE id = ? LIMIT 1',
    [sectionId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.guide_id !== guideId) {
    throw BizError.forbidden('Section does not belong to this guide');
  }

  const guideService = new GuideService(getDatabaseService());
  const updated = await guideService.updateSection(sectionId, updateFields as Parameters<typeof guideService.updateSection>[1]);

  await recalculateWordCount(guideId);

  return createSuccessResponse({ section: updated, message: 'Section updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete section
// ============================================================================

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);
  const guideId = extractGuideId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyGuideOwnership(guideId, listingId);

  const body = await context.request.json() as Record<string, unknown>;
  const { sectionId } = body;

  if (!sectionId || typeof sectionId !== 'number') {
    throw BizError.badRequest('sectionId is required and must be a number');
  }

  // Verify section belongs to this guide
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ guide_id: number }>(
    'SELECT guide_id FROM content_guide_sections WHERE id = ? LIMIT 1',
    [sectionId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.guide_id !== guideId) {
    throw BizError.forbidden('Section does not belong to this guide');
  }

  const guideService = new GuideService(getDatabaseService());
  await guideService.deleteSection(sectionId);

  await recalculateWordCount(guideId);

  return createSuccessResponse({ message: 'Section deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
