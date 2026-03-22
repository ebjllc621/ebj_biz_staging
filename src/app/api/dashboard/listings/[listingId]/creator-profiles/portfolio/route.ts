/**
 * Dashboard Creator Profile Portfolio API Route
 * GET    /api/dashboard/listings/[listingId]/creator-profiles/portfolio — List portfolio items
 * POST   /api/dashboard/listings/[listingId]/creator-profiles/portfolio — Add portfolio item
 * PATCH  /api/dashboard/listings/[listingId]/creator-profiles/portfolio — Update or reorder items
 * DELETE /api/dashboard/listings/[listingId]/creator-profiles/portfolio — Delete item
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, PATCH, DELETE)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership + profile ownership + item ownership validation
 *
 * @authority CLAUDE.md - API Standards section
 * @phase Tier 3 Creator Profiles - Phase 8B
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles/portfolio
  const creatorProfilesIndex = segments.indexOf('creator-profiles');
  if (creatorProfilesIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[creatorProfilesIndex - 1];
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
// GET — List portfolio items
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const amService = new AffiliateMarketerService(getDatabaseService());
  const profile = await amService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Affiliate marketer profile not found');
  }

  const portfolio = await amService.getPortfolio(profile.id);

  return createSuccessResponse({ portfolio, profileId: profile.id }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Add portfolio item
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const body = await context.request.json() as Record<string, unknown>;

  const { campaign_title } = body;
  if (!campaign_title || typeof campaign_title !== 'string') {
    throw BizError.badRequest('campaign_title is required');
  }
  if (campaign_title.trim().length < 2 || campaign_title.trim().length > 255) {
    throw BizError.badRequest('campaign_title must be between 2 and 255 characters');
  }

  const amService = new AffiliateMarketerService(getDatabaseService());
  const profile = await amService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Affiliate marketer profile not found');
  }

  const item = await amService.addPortfolioItem(profile.id, {
    campaign_title: campaign_title.trim(),
    brand_name: typeof body.brand_name === 'string' ? body.brand_name.trim() || undefined : undefined,
    brand_logo: typeof body.brand_logo === 'string' ? body.brand_logo.trim() || undefined : undefined,
    description: typeof body.description === 'string' ? body.description.trim() || undefined : undefined,
    results_summary: typeof body.results_summary === 'string' ? body.results_summary.trim() || undefined : undefined,
    conversion_rate: typeof body.conversion_rate === 'number' ? body.conversion_rate : (typeof body.conversion_rate === 'string' && body.conversion_rate ? parseFloat(body.conversion_rate) : undefined),
    content_url: typeof body.content_url === 'string' ? body.content_url.trim() || undefined : undefined,
    campaign_date: typeof body.campaign_date === 'string' && body.campaign_date ? new Date(body.campaign_date) : undefined,
  });

  return createSuccessResponse({ item, message: 'Portfolio item added successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update item or reorder portfolio
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

  const amService = new AffiliateMarketerService(getDatabaseService());
  const profile = await amService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Affiliate marketer profile not found');
  }

  if (body.reorder === true) {
    const { itemIds } = body;
    if (!Array.isArray(itemIds) || !itemIds.every((id: unknown) => typeof id === 'number')) {
      throw BizError.badRequest('itemIds must be an array of numbers');
    }

    await amService.reorderPortfolio(profile.id, itemIds as number[]);

    return createSuccessResponse({ message: 'Portfolio reordered successfully' }, context.requestId);
  }

  // Update single item
  const { itemId, ...updateFields } = body;

  if (!itemId || typeof itemId !== 'number') {
    throw BizError.badRequest('itemId is required and must be a number');
  }

  // Verify item belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ marketer_id: number }>(
    'SELECT marketer_id FROM affiliate_marketer_portfolio WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.marketer_id !== profile.id) {
    throw BizError.forbidden('Portfolio item does not belong to your profile');
  }

  const updated = await amService.updatePortfolioItem(itemId, updateFields as Parameters<typeof amService.updatePortfolioItem>[1]);

  return createSuccessResponse({ item: updated, message: 'Portfolio item updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete portfolio item
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
  const { itemId } = body;

  if (!itemId || typeof itemId !== 'number') {
    throw BizError.badRequest('itemId is required and must be a number');
  }

  const amService = new AffiliateMarketerService(getDatabaseService());
  const profile = await amService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Affiliate marketer profile not found');
  }

  // Verify item belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ marketer_id: number }>(
    'SELECT marketer_id FROM affiliate_marketer_portfolio WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.marketer_id !== profile.id) {
    throw BizError.forbidden('Portfolio item does not belong to your profile');
  }

  await amService.deletePortfolioItem(itemId);

  return createSuccessResponse({ message: 'Portfolio item deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
