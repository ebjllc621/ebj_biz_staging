/**
 * Platform Disconnect Route
 * POST /api/dashboard/listings/[listingId]/creator-profiles/platform/disconnect
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - withCsrf: MANDATORY (state-changing)
 * - requireAuth: true
 * - Listing ownership validation: MANDATORY
 * - Soft delete only (is_active = 0) — history preserved
 *
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-2
 * @reference src/app/api/dashboard/listings/[listingId]/creator-profiles/route.ts — auth chain
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { getPlatformSyncService } from '@core/services/PlatformSyncService';
import type { SyncPlatform, ProfileSyncType } from '@core/types/platform-sync';

// ============================================================================
// Helpers (replicated from creator-profiles/route.ts)
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  const listingsIndex = segments.indexOf('listings');
  if (listingsIndex < 0) throw BizError.badRequest('Invalid URL structure');
  const raw = segments[listingsIndex + 1];
  const id = parseInt(raw ?? '');
  if (!raw || isNaN(id)) throw BizError.badRequest('Invalid listing ID');
  return id;
}

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

const VALID_PLATFORMS: SyncPlatform[] = ['youtube', 'instagram', 'tiktok'];
const VALID_PROFILE_TYPES: ProfileSyncType[] = ['affiliate_marketer', 'internet_personality'];

// ============================================================================
// POST — Disconnect platform
// ============================================================================

export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  await verifyListingOwnership(listingId, user.id);

  const body = await context.request.json() as Record<string, unknown>;
  const { platform, profile_type, profile_id } = body;

  if (!platform || !VALID_PLATFORMS.includes(platform as SyncPlatform)) {
    throw BizError.badRequest(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }
  if (!profile_type || !VALID_PROFILE_TYPES.includes(profile_type as ProfileSyncType)) {
    throw BizError.badRequest(`profile_type must be one of: ${VALID_PROFILE_TYPES.join(', ')}`);
  }
  if (!profile_id || typeof profile_id !== 'number') {
    throw BizError.badRequest('profile_id is required and must be a number');
  }

  const syncPlatform = platform as SyncPlatform;
  const syncProfileType = profile_type as ProfileSyncType;
  const syncProfileId = profile_id as number;

  // Verify profile belongs to user
  const db = getDatabaseService();
  if (syncProfileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    const profile = await amService.getMarketerById(syncProfileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  } else {
    const ipService = new InternetPersonalityService(db);
    const profile = await ipService.getPersonalityById(syncProfileId);
    if (!profile || profile.user_id !== user.id) throw BizError.forbidden('Profile does not belong to this user');
  }

  const syncService = getPlatformSyncService();
  await syncService.disconnectPlatform(syncProfileType, syncProfileId, syncPlatform);

  return createSuccessResponse({ disconnected: true }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
