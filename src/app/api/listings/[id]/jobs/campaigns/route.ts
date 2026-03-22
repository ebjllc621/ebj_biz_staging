/**
 * Hiring Campaigns API Route
 *
 * GET /api/listings/[id]/jobs/campaigns - Get campaigns for listing
 * POST /api/listings/[id]/jobs/campaigns - Create campaign
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getHiringCampaignService } from '@core/services/HiringCampaignService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import type { CreateHiringCampaignInput, CampaignFilters } from '@features/jobs/types';

function extractListingId(url: string): number {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  if (!listingIdStr) throw BizError.badRequest('Listing ID is required');
  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) throw BizError.badRequest('Invalid listing ID');
  return listingId;
}

async function verifyListingOwnership(listingId: number, userId: number): Promise<boolean> {
  const db = getDatabaseService();
  const result = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ? LIMIT 1',
    [listingId]
  );
  return result.rows[0]?.user_id === userId;
}

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) throw BizError.unauthorized('Authentication required');

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) throw BizError.forbidden('view campaigns', 'listing');

  const url = new URL(context.request.url);
  const searchParams = url.searchParams;

  const campaignType = searchParams.get('campaign_type');
  const status = searchParams.get('status');
  const season = searchParams.get('season');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const filters: CampaignFilters = {};
  if (campaignType) filters.campaign_type = campaignType as CampaignFilters['campaign_type'];
  if (status) filters.status = status as CampaignFilters['status'];
  if (season) filters.season = season as CampaignFilters['season'];

  const campaignService = getHiringCampaignService();
  const result = await campaignService.getCampaignsByListing(listingId, filters, page, limit);

  return createSuccessResponse({
    campaigns: result.data,
    pagination: result.pagination
  }, context.requestId);
});

export const POST = apiHandler(async (context: ApiContext) => {
  if (!context.userId) throw BizError.unauthorized('Authentication required');

  const listingId = extractListingId(context.request.url);
  const userId = parseInt(context.userId, 10);

  const isOwner = await verifyListingOwnership(listingId, userId);
  if (!isOwner) throw BizError.forbidden('create campaigns', 'listing');

  const body = await context.request.json() as Omit<CreateHiringCampaignInput, 'listing_id'>;

  const campaignService = getHiringCampaignService();
  const campaign = await campaignService.createCampaign({
    ...body,
    listing_id: listingId
  });

  return createSuccessResponse({ campaign }, context.requestId);
});
