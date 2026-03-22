/**
 * Dashboard Creator Profile Collaborations API Route
 * GET    /api/dashboard/listings/[listingId]/creator-profiles/collaborations — List collaborations
 * POST   /api/dashboard/listings/[listingId]/creator-profiles/collaborations — Add collaboration
 * PATCH  /api/dashboard/listings/[listingId]/creator-profiles/collaborations — Update or reorder
 * DELETE /api/dashboard/listings/[listingId]/creator-profiles/collaborations — Delete collaboration
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
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles/collaborations
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
// GET — List collaborations
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const ipService = new InternetPersonalityService(getDatabaseService());
  const profile = await ipService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Internet personality profile not found');
  }

  const collaborations = await ipService.getCollaborations(profile.id);

  return createSuccessResponse({ collaborations, profileId: profile.id }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Add collaboration
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

  const { brand_name } = body;
  if (!brand_name || typeof brand_name !== 'string') {
    throw BizError.badRequest('brand_name is required');
  }
  if (brand_name.trim().length < 2 || brand_name.trim().length > 255) {
    throw BizError.badRequest('brand_name must be between 2 and 255 characters');
  }

  const ipService = new InternetPersonalityService(getDatabaseService());
  const profile = await ipService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Internet personality profile not found');
  }

  const item = await ipService.addCollaboration(profile.id, {
    brand_name: brand_name.trim(),
    brand_logo: typeof body.brand_logo === 'string' ? body.brand_logo.trim() || undefined : undefined,
    collaboration_type: typeof body.collaboration_type === 'string' ? body.collaboration_type.trim() || undefined : undefined,
    description: typeof body.description === 'string' ? body.description.trim() || undefined : undefined,
    content_url: typeof body.content_url === 'string' ? body.content_url.trim() || undefined : undefined,
    collaboration_date: typeof body.collaboration_date === 'string' && body.collaboration_date ? new Date(body.collaboration_date) : undefined,
  });

  return createSuccessResponse({ item, message: 'Collaboration added successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update collaboration or reorder
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

  const ipService = new InternetPersonalityService(getDatabaseService());
  const profile = await ipService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Internet personality profile not found');
  }

  if (body.reorder === true) {
    const { itemIds } = body;
    if (!Array.isArray(itemIds) || !itemIds.every((id: unknown) => typeof id === 'number')) {
      throw BizError.badRequest('itemIds must be an array of numbers');
    }

    await ipService.reorderCollaborations(profile.id, itemIds as number[]);

    return createSuccessResponse({ message: 'Collaborations reordered successfully' }, context.requestId);
  }

  // Update single item
  const { itemId, ...updateFields } = body;

  if (!itemId || typeof itemId !== 'number') {
    throw BizError.badRequest('itemId is required and must be a number');
  }

  // Verify item belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ personality_id: number }>(
    'SELECT personality_id FROM internet_personality_collaborations WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.personality_id !== profile.id) {
    throw BizError.forbidden('Collaboration does not belong to your profile');
  }

  const updated = await ipService.updateCollaboration(itemId, updateFields as Parameters<typeof ipService.updateCollaboration>[1]);

  return createSuccessResponse({ item: updated, message: 'Collaboration updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete collaboration
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

  const ipService = new InternetPersonalityService(getDatabaseService());
  const profile = await ipService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Internet personality profile not found');
  }

  // Verify item belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ personality_id: number }>(
    'SELECT personality_id FROM internet_personality_collaborations WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.personality_id !== profile.id) {
    throw BizError.forbidden('Collaboration does not belong to your profile');
  }

  await ipService.deleteCollaboration(itemId);

  return createSuccessResponse({ message: 'Collaboration deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
