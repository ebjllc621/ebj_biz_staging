/**
 * GET/PUT/DELETE /api/listings/[id]/campaigns/[campaignId] - Campaign Detail API
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use CampaignService for business logic
 * - MUST authorize: user owns campaign or is admin
 * - MUST validate campaign belongs to listing
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { CampaignService } from '@core/services/CampaignService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch single campaign
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const campaignService = new CampaignService(db);

  // Extract IDs from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  const campaignIdStr = pathParts[pathParts.indexOf('campaigns') + 1];

  if (!listingIdStr || !campaignIdStr) {
    throw BizError.badRequest('Listing ID and Campaign ID are required');
  }

  const listingId = parseInt(listingIdStr, 10);
  const campaignId = parseInt(campaignIdStr, 10);

  if (isNaN(listingId) || isNaN(campaignId)) {
    throw BizError.badRequest('Invalid listing ID or campaign ID');
  }

  // Verify listing ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  // Check if admin
  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ?',
    [parseInt(context.userId, 10)]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to view this campaign');
  }

  // Get campaign
  const campaign = await campaignService.getCampaignById(campaignId);

  if (!campaign) {
    throw BizError.notFound('Campaign not found');
  }

  // Verify campaign belongs to listing's user
  const ownerUserId = ownershipResult.rows[0]?.user_id;
  if (!ownerUserId || campaign.user_id !== ownerUserId) {
    throw BizError.forbidden('Campaign does not belong to this listing');
  }

  return createSuccessResponse(campaign, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

/**
 * PUT handler - Update campaign
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const campaignService = new CampaignService(db);

  // Extract IDs from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  const campaignIdStr = pathParts[pathParts.indexOf('campaigns') + 1];

  if (!listingIdStr || !campaignIdStr) {
    throw BizError.badRequest('Listing ID and Campaign ID are required');
  }

  const listingId = parseInt(listingIdStr, 10);
  const campaignId = parseInt(campaignIdStr, 10);

  if (isNaN(listingId) || isNaN(campaignId)) {
    throw BizError.badRequest('Invalid listing ID or campaign ID');
  }

  // Verify listing ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  if (!isOwner) {
    throw BizError.forbidden('You do not have permission to update this campaign');
  }

  // Get existing campaign
  const existingCampaign = await campaignService.getCampaignById(campaignId);

  if (!existingCampaign) {
    throw BizError.notFound('Campaign not found');
  }

  // Verify campaign belongs to listing's user
  const ownerUserId = ownershipResult.rows[0]?.user_id;
  if (!ownerUserId || existingCampaign.user_id !== ownerUserId) {
    throw BizError.forbidden('Campaign does not belong to this listing');
  }

  // Parse request body
  const body = await context.request.json();

  // Update campaign
  const updates: Partial<{
    title: string;
    description: string;
    budget: number;
    daily_budget: number;
    start_date: Date;
    end_date: Date;
    target_audience: { categories?: number[]; locations?: string[]; tiers?: string[]; engagement?: string };
    creatives: { images?: string[]; text?: string; cta?: string };
  }> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.budget !== undefined) updates.budget = parseFloat(body.budget);
  if (body.daily_budget !== undefined) updates.daily_budget = parseFloat(body.daily_budget);
  if (body.start_date !== undefined) updates.start_date = new Date(body.start_date);
  if (body.end_date !== undefined) updates.end_date = new Date(body.end_date);
  if (body.target_audience !== undefined) updates.target_audience = body.target_audience;
  if (body.creatives !== undefined) updates.creatives = body.creatives;

  const updatedCampaign = await campaignService.updateCampaign(campaignId, updates as Parameters<typeof campaignService.updateCampaign>[1]);

  return createSuccessResponse(updatedCampaign, context.requestId);
}, {
  allowedMethods: ['PUT'],
  requireAuth: true
});

/**
 * DELETE handler - Delete campaign
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const campaignService = new CampaignService(db);

  // Extract IDs from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];
  const campaignIdStr = pathParts[pathParts.indexOf('campaigns') + 1];

  if (!listingIdStr || !campaignIdStr) {
    throw BizError.badRequest('Listing ID and Campaign ID are required');
  }

  const listingId = parseInt(listingIdStr, 10);
  const campaignId = parseInt(campaignIdStr, 10);

  if (isNaN(listingId) || isNaN(campaignId)) {
    throw BizError.badRequest('Invalid listing ID or campaign ID');
  }

  // Verify listing ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  if (!isOwner) {
    throw BizError.forbidden('You do not have permission to delete this campaign');
  }

  // Get existing campaign
  const existingCampaign = await campaignService.getCampaignById(campaignId);

  if (!existingCampaign) {
    throw BizError.notFound('Campaign not found');
  }

  // Verify campaign belongs to listing's user
  const ownerUserId = ownershipResult.rows[0]?.user_id;
  if (!ownerUserId || existingCampaign.user_id !== ownerUserId) {
    throw BizError.forbidden('Campaign does not belong to this listing');
  }

  // Delete campaign
  await campaignService.deleteCampaign(campaignId);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  allowedMethods: ['DELETE'],
  requireAuth: true
});
