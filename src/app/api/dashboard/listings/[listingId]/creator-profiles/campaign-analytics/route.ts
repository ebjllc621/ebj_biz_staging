/**
 * Dashboard Listing Creator Profiles Campaign Analytics API Route
 * GET  /api/dashboard/listings/[listingId]/creator-profiles/campaign-analytics
 * POST /api/dashboard/listings/[listingId]/creator-profiles/campaign-analytics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - withCsrf: MANDATORY for state-changing POST operations
 * - requireAuth: true
 * - getUserFromRequest: MANDATORY for auth
 * - DatabaseService boundary: All DB operations via service layer
 * - Listing ownership validation on all operations
 * - bigIntToNumber: MANDATORY for all COUNT(*) results
 *
 * @authority CLAUDE.md - API Standards section
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
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
  const listingsIndex = segments.indexOf('listings');
  if (listingsIndex === -1 || listingsIndex + 1 >= segments.length) {
    throw BizError.badRequest('Invalid URL structure');
  }
  const raw = segments[listingsIndex + 1];
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
// GET — Fetch campaign analytics
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

  const profileIdParam = url.searchParams.get('profileId');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

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
  const amService = new AffiliateMarketerService(db);
  const data = await amService.getCampaignAnalytics(profileId, { start, end });

  return createSuccessResponse(
    { ...data, dateRange: { start, end } },
    context.requestId
  );
}, {
  requireAuth: true,
  allowedMethods: ['GET'],
});

// ============================================================================
// POST — Campaign metrics CRUD (add / update / delete)
// ============================================================================

export const POST = withCsrf(apiHandler<unknown>(async (context: ApiContext) => {
  const url = new URL(context.request.url);
  const listingId = extractListingId(url);

  const user = await getUserFromRequest(context.request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  await verifyListingOwnership(listingId, user.id);
  await verifyCreatorSuite(listingId);

  const body = await context.request.json() as {
    action: 'add' | 'update' | 'delete';
    profileId?: number;
    campaignId?: number;
    campaignData?: {
      campaignName?: string;
      network?: string;
      portfolioItemId?: number;
      impressions?: number;
      clicks?: number;
      conversions?: number;
      revenue?: number;
      commissionRate?: number;
      periodStart?: string;
      periodEnd?: string;
    };
  };

  const { action, profileId, campaignId, campaignData } = body;

  if (!action) {
    throw BizError.badRequest('action is required (add, update, or delete)');
  }

  const db = getDatabaseService();
  const amService = new AffiliateMarketerService(db);

  if (action === 'add') {
    if (!profileId) throw BizError.badRequest('profileId is required for add');
    if (!campaignData?.campaignName) throw BizError.badRequest('campaignName is required');
    const newId = await amService.addCampaignMetrics(profileId, campaignData as Parameters<typeof amService.addCampaignMetrics>[1]);
    return createSuccessResponse({ id: newId }, context.requestId);
  }

  if (action === 'update') {
    if (!campaignId) throw BizError.badRequest('campaignId is required for update');
    if (!campaignData) throw BizError.badRequest('campaignData is required for update');
    await amService.updateCampaignMetrics(campaignId, campaignData);
    return createSuccessResponse({ updated: true }, context.requestId);
  }

  if (action === 'delete') {
    if (!campaignId) throw BizError.badRequest('campaignId is required for delete');
    await amService.deleteCampaignMetrics(campaignId);
    return createSuccessResponse({ deleted: true }, context.requestId);
  }

  throw BizError.badRequest('action must be add, update, or delete');
}, {
  requireAuth: true,
  allowedMethods: ['POST'],
}));
