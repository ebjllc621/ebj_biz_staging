/**
 * Dashboard Listing Creator Profiles Analytics API Route
 * GET /api/dashboard/listings/[listingId]/creator-profiles/analytics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - requireAuth: true
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership validation on all operations
 * - bigIntToNumber: MANDATORY for all COUNT(*) results
 *
 * @authority CLAUDE.md - API Standards section
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8C_PROFILE_ANALYTICS_SEO_PREVIEW.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { AffiliateMarketerService } from '@core/services/AffiliateMarketerService';
import { InternetPersonalityService } from '@core/services/InternetPersonalityService';

// ============================================================================
// Helper: Extract and validate listingId from URL
// ============================================================================

function extractListingId(url: URL): number {
  const segments = url.pathname.split('/');
  // /api/dashboard/listings/[listingId]/creator-profiles/analytics
  const analyticsIndex = segments.indexOf('analytics');
  if (analyticsIndex < 3) {
    throw BizError.badRequest('Invalid URL structure');
  }
  // creator-profiles is at analyticsIndex - 1, listingId is at analyticsIndex - 2
  const raw = segments[analyticsIndex - 2];
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
// GET — Fetch profile analytics
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

  // Extract query params
  const type = url.searchParams.get('type');
  const profileIdParam = url.searchParams.get('profileId');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  if (!type || !['affiliate_marketer', 'internet_personality'].includes(type)) {
    throw BizError.badRequest('type must be affiliate_marketer or internet_personality');
  }
  if (!profileIdParam) {
    throw BizError.badRequest('profileId is required');
  }
  const profileId = parseInt(profileIdParam);
  if (isNaN(profileId)) {
    throw BizError.badRequest('profileId must be a number');
  }
  if (!start || !end) {
    throw BizError.badRequest('start and end date params are required');
  }

  const db = getDatabaseService();
  const dateRange = { start, end };

  let analytics;
  if (type === 'affiliate_marketer') {
    const amService = new AffiliateMarketerService(db);
    analytics = await amService.getProfileAnalytics(profileId, dateRange);
  } else {
    const ipService = new InternetPersonalityService(db);
    analytics = await ipService.getProfileAnalytics(profileId, dateRange);
  }

  return createSuccessResponse(
    { ...analytics, dateRange: { start, end } },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});
