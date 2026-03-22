/**
 * Dashboard Creator Profile Episodes API Route
 * GET    /api/dashboard/listings/[listingId]/creator-profiles/episodes — List episodes
 * POST   /api/dashboard/listings/[listingId]/creator-profiles/episodes — Add episode
 * PATCH  /api/dashboard/listings/[listingId]/creator-profiles/episodes — Update or reorder episodes
 * DELETE /api/dashboard/listings/[listingId]/creator-profiles/episodes — Delete episode
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, PATCH, DELETE)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership + profile ownership + item ownership validation
 * - Creator Suite add-on validation on create operations
 *
 * @authority CLAUDE.md - API Standards section
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C (Podcaster Parity)
 * @reference src/app/api/dashboard/listings/[listingId]/creator-profiles/portfolio/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { PodcasterService } from '@core/services/PodcasterService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles/episodes
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
    throw BizError.forbidden('Creator Suite add-on required to manage creator profiles');
  }
}

// ============================================================================
// GET — List episodes
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const podService = new PodcasterService(getDatabaseService());
  const profile = await podService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Podcaster profile not found');
  }

  const episodes = await podService.getEpisodes(profile.id);

  return createSuccessResponse({ episodes, profileId: profile.id }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Add episode
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

  const { episode_title } = body;
  if (!episode_title || typeof episode_title !== 'string') {
    throw BizError.badRequest('episode_title is required');
  }
  if (episode_title.trim().length < 2 || episode_title.trim().length > 255) {
    throw BizError.badRequest('episode_title must be between 2 and 255 characters');
  }

  const podService = new PodcasterService(getDatabaseService());
  const profile = await podService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Podcaster profile not found');
  }

  const item = await podService.addEpisode(profile.id, {
    episode_title: episode_title.trim(),
    episode_number: typeof body.episode_number === 'number' ? body.episode_number : (typeof body.episode_number === 'string' && body.episode_number ? parseInt(body.episode_number) : undefined),
    season_number: typeof body.season_number === 'number' ? body.season_number : (typeof body.season_number === 'string' && body.season_number ? parseInt(body.season_number) : undefined),
    description: typeof body.description === 'string' ? body.description.trim() || undefined : undefined,
    audio_url: typeof body.audio_url === 'string' ? body.audio_url.trim() || undefined : undefined,
    duration: typeof body.duration === 'number' ? body.duration : (typeof body.duration === 'string' && body.duration ? parseInt(body.duration) : undefined),
    guest_names: Array.isArray(body.guest_names) ? (body.guest_names as string[]) : undefined,
    published_at: typeof body.published_at === 'string' && body.published_at ? new Date(body.published_at) : undefined,
  });

  return createSuccessResponse({ item, message: 'Episode added successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update episode or reorder episodes
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

  const podService = new PodcasterService(getDatabaseService());
  const profile = await podService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Podcaster profile not found');
  }

  if (body.reorder === true) {
    const { itemIds } = body;
    if (!Array.isArray(itemIds) || !itemIds.every((id: unknown) => typeof id === 'number')) {
      throw BizError.badRequest('itemIds must be an array of numbers');
    }

    await podService.reorderEpisodes(profile.id, itemIds as number[]);

    return createSuccessResponse({ message: 'Episodes reordered successfully' }, context.requestId);
  }

  // Update single episode
  const { itemId, ...updateFields } = body;

  if (!itemId || typeof itemId !== 'number') {
    throw BizError.badRequest('itemId is required and must be a number');
  }

  // Verify episode belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ podcaster_id: number }>(
    'SELECT podcaster_id FROM podcaster_episodes WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.podcaster_id !== profile.id) {
    throw BizError.forbidden('Episode does not belong to your profile');
  }

  const updated = await podService.updateEpisode(itemId, updateFields as Parameters<typeof podService.updateEpisode>[1]);

  return createSuccessResponse({ item: updated, message: 'Episode updated successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));

// ============================================================================
// DELETE — Delete episode
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

  const podService = new PodcasterService(getDatabaseService());
  const profile = await podService.getProfileByUserId(user.id);
  if (!profile) {
    throw BizError.notFound('Podcaster profile not found');
  }

  // Verify episode belongs to this profile
  const db = getDatabaseService();
  const ownershipResult = await db.query<{ podcaster_id: number }>(
    'SELECT podcaster_id FROM podcaster_episodes WHERE id = ? LIMIT 1',
    [itemId]
  );
  const ownershipRow = ownershipResult.rows[0];
  if (!ownershipResult.rows.length || !ownershipRow || ownershipRow.podcaster_id !== profile.id) {
    throw BizError.forbidden('Episode does not belong to your profile');
  }

  await podService.deleteEpisode(itemId);

  return createSuccessResponse({ message: 'Episode deleted successfully' }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['DELETE'],
}));
