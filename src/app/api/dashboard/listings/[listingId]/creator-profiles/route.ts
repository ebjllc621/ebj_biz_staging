/**
 * Dashboard Listing Creator Profiles API Route
 * GET   /api/dashboard/listings/[listingId]/creator-profiles — Get user's creator profiles
 * POST  /api/dashboard/listings/[listingId]/creator-profiles — Create creator profile
 * PATCH /api/dashboard/listings/[listingId]/creator-profiles — Update creator profile
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing operations (POST, PATCH)
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership validation on all operations
 * - Creator Suite add-on validation on create operations
 * - bigIntToNumber: MANDATORY for all COUNT(*) results
 *
 * @authority CLAUDE.md - API Standards section
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8A_DASHBOARD_PROFILE_CRUD.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';
import { PodcasterService } from '@core/services/PodcasterService';
import { bigIntToNumber } from '@core/utils/bigint';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles
  const profilesIndex = segments.indexOf('creator-profiles');
  if (profilesIndex < 2) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[profilesIndex - 1];
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
// GET — List user's creator profiles
// ============================================================================

export const GET = apiHandler(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);

  const db = getDatabaseService();
  const amService = new AffiliateMarketerService(db);
  const ipService = new InternetPersonalityService(db);
  const podService = new PodcasterService(db);

  // Fetch all profiles in parallel
  const [amProfile, ipProfile, podProfile] = await Promise.all([
    amService.getProfileByUserId(user.id),
    ipService.getProfileByUserId(user.id),
    podService.getProfileByUserId(user.id),
  ]);

  // Fetch sub-entity counts (only if profiles exist)
  let portfolioCount = 0;
  let collaborationCount = 0;
  let episodeCount = 0;

  if (amProfile) {
    const portfolioResult = await db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM affiliate_marketer_portfolio WHERE marketer_id = ?',
      [amProfile.id]
    );
    portfolioCount = bigIntToNumber(portfolioResult.rows[0]?.cnt ?? 0);
  }

  if (ipProfile) {
    const collaborationResult = await db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM internet_personality_collaborations WHERE personality_id = ?',
      [ipProfile.id]
    );
    collaborationCount = bigIntToNumber(collaborationResult.rows[0]?.cnt ?? 0);
  }

  if (podProfile) {
    const episodeResult = await db.query<{ cnt: bigint | number }>(
      'SELECT COUNT(*) as cnt FROM podcaster_episodes WHERE podcaster_id = ?',
      [podProfile.id]
    );
    episodeCount = bigIntToNumber(episodeResult.rows[0]?.cnt ?? 0);
  }

  return createSuccessResponse(
    {
      profiles: {
        affiliate_marketer: amProfile,
        internet_personality: ipProfile,
        podcaster: podProfile,
      },
      portfolioCount,
      collaborationCount,
      episodeCount,
    },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Create new creator profile
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
  const { profileType, display_name, ...fields } = body;

  // Validate profileType
  if (!profileType || !['affiliate_marketer', 'internet_personality', 'podcaster'].includes(profileType as string)) {
    throw BizError.badRequest('profileType must be affiliate_marketer, internet_personality, or podcaster');
  }

  // Validate display_name
  if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2 || display_name.trim().length > 255) {
    throw BizError.badRequest('display_name is required and must be 2-255 characters');
  }

  const db = getDatabaseService();
  let created;

  if (profileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    // Uniqueness check
    const existing = await amService.getProfileByUserId(user.id);
    if (existing) {
      throw BizError.badRequest('You already have an affiliate marketer profile');
    }
    created = await amService.createProfile(user.id, {
      ...(fields as Record<string, unknown>),
      display_name: display_name.trim(),
      listing_id: listingId,
    } as Parameters<typeof amService.createProfile>[1]);
  } else if (profileType === 'internet_personality') {
    const ipService = new InternetPersonalityService(db);
    // Uniqueness check
    const existing = await ipService.getProfileByUserId(user.id);
    if (existing) {
      throw BizError.badRequest('You already have an internet personality profile');
    }
    created = await ipService.createProfile(user.id, {
      ...(fields as Record<string, unknown>),
      display_name: display_name.trim(),
      listing_id: listingId,
    } as Parameters<typeof ipService.createProfile>[1]);
  } else {
    const podService = new PodcasterService(db);
    const existing = await podService.getProfileByUserId(user.id);
    if (existing) {
      throw BizError.badRequest('You already have a podcaster profile');
    }
    created = await podService.createProfile(user.id, {
      ...(fields as Record<string, unknown>),
      display_name: display_name.trim(),
      listing_id: listingId,
    } as Parameters<typeof podService.createProfile>[1]);
  }

  return createSuccessResponse({ profile: created }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));

// ============================================================================
// PATCH — Update existing creator profile
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
  const { profileId, profileType, ...updateFields } = body;

  // Validate profileType
  if (!profileType || !['affiliate_marketer', 'internet_personality', 'podcaster'].includes(profileType as string)) {
    throw BizError.badRequest('profileType must be affiliate_marketer, internet_personality, or podcaster');
  }

  // Validate profileId
  if (!profileId || typeof profileId !== 'number') {
    throw BizError.badRequest('profileId is required and must be a number');
  }

  const db = getDatabaseService();
  let updated;

  if (profileType === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    // Verify profile belongs to this user
    const existing = await amService.getMarketerById(profileId);
    if (!existing || existing.user_id !== user.id) {
      throw BizError.forbidden('Profile does not belong to this user');
    }
    updated = await amService.updateProfile(
      profileId,
      updateFields as Parameters<typeof amService.updateProfile>[1]
    );
  } else if (profileType === 'internet_personality') {
    const ipService = new InternetPersonalityService(db);
    // Verify profile belongs to this user
    const existing = await ipService.getPersonalityById(profileId);
    if (!existing || existing.user_id !== user.id) {
      throw BizError.forbidden('Profile does not belong to this user');
    }
    updated = await ipService.updateProfile(
      profileId,
      updateFields as Parameters<typeof ipService.updateProfile>[1]
    );
  } else {
    const podService = new PodcasterService(db);
    const existing = await podService.getPodcasterById(profileId);
    if (!existing || existing.user_id !== user.id) {
      throw BizError.forbidden('Profile does not belong to this user');
    }
    updated = await podService.updateProfile(
      profileId,
      updateFields as Parameters<typeof podService.updateProfile>[1]
    );
  }

  return createSuccessResponse({ profile: updated }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['PATCH'],
}));
