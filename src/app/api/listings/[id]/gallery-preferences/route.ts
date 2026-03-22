/**
 * Gallery Preferences API Route
 * GET  /api/listings/[id]/gallery-preferences - Get gallery layout preference
 * PUT  /api/listings/[id]/gallery-preferences - Update gallery layout preference
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY for PUT
 * - getUserFromRequest: MANDATORY for auth
 * - createSuccessResponse: MANDATORY for responses
 * - mariadb ? placeholders (NOT $1)
 * - Listing ownership verified before mutations
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Phase 8A - Gallery Display Standardization
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

const VALID_LAYOUTS = ['grid', 'masonry', 'carousel', 'justified'] as const;
type GalleryLayout = typeof VALID_LAYOUTS[number];

// ============================================================================
// HELPERS
// ============================================================================

function extractListingId(url: string): number {
  const urlObj = new URL(url);
  const segments = urlObj.pathname.split('/');
  // /api/listings/[id]/gallery-preferences -> id is before 'gallery-preferences'
  const idIndex = segments.indexOf('gallery-preferences') - 1;
  const id = segments[idIndex];
  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }
  const listingId = parseInt(id, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }
  return listingId;
}

// ============================================================================
// GET /api/listings/[id]/gallery-preferences
// Public - no auth needed to read layout preference
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);

  const db = getDatabaseService();
  const result = await db.query<{ gallery_layout: GalleryLayout | null }>(
    'SELECT gallery_layout FROM listings WHERE id = ? AND status != ?',
    [listingId, 'deleted']
  );

  if (!result.rows || result.rows.length === 0) {
    throw BizError.notFound('Listing', listingId);
  }

  const galleryLayout = result.rows[0]?.gallery_layout ?? 'grid';

  return createSuccessResponse(
    { gallery_layout: galleryLayout },
    context.requestId
  );
}, {
  requireAuth: false,
  allowedMethods: ['GET']
});

// ============================================================================
// PUT /api/listings/[id]/gallery-preferences
// Requires auth + listing ownership
// ============================================================================

export const PUT = withCsrf(apiHandler(async (context: ApiContext) => {
  const listingId = extractListingId(context.request.url);

  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  // Verify listing ownership
  const ownerResult = await db.query<{ user_id: number | null }>(
    'SELECT user_id FROM listings WHERE id = ? AND status != ?',
    [listingId, 'deleted']
  );

  if (!ownerResult.rows || ownerResult.rows.length === 0) {
    throw BizError.notFound('Listing', listingId);
  }

  const listing = ownerResult.rows[0];
  if (!listing) {
    throw BizError.notFound('Listing', listingId);
  }

  if (listing.user_id !== user.id && user.role !== 'admin') {
    throw BizError.forbidden('update gallery preferences for', 'listing');
  }

  // Parse and validate body
  const body = await context.request.json() as { gallery_layout?: string };
  const { gallery_layout } = body;

  if (!gallery_layout) {
    throw BizError.badRequest('gallery_layout is required');
  }

  if (!VALID_LAYOUTS.includes(gallery_layout as GalleryLayout)) {
    throw BizError.badRequest(
      `Invalid gallery_layout. Must be one of: ${VALID_LAYOUTS.join(', ')}`
    );
  }

  await db.query(
    'UPDATE listings SET gallery_layout = ? WHERE id = ?',
    [gallery_layout, listingId]
  );

  return createSuccessResponse(
    { gallery_layout: gallery_layout as GalleryLayout, updated: true },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['PUT']
}));
