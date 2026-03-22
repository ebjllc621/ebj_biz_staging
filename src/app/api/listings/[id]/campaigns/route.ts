/**
 * GET/POST /api/listings/[id]/campaigns - Listing Campaigns API
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use CampaignService for business logic
 * - MUST use bigIntToNumber for COUNT(*) results
 * - MUST use createSuccessResponse for responses
 * - MUST authorize: user owns listing or is admin
 * - ALL queries MUST use listing_id context
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { CampaignService } from '@core/services/CampaignService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * GET handler - Fetch all campaigns for a listing
 */
export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const campaignService = new CampaignService(db);

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  // Verify ownership
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
    throw BizError.forbidden('You do not have permission to view these campaigns');
  }

  const ownerUserId = ownershipResult.rows[0]?.user_id;
  if (!ownerUserId) {
    throw BizError.badRequest('Invalid listing ownership data');
  }

  // Get campaigns for this listing
  const campaigns = await campaignService.getAllCampaigns(
    { user_id: ownerUserId },
    { page: 1, limit: 100 }
  );

  return createSuccessResponse(campaigns, context.requestId);
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});

/**
 * POST handler - Create new campaign for listing
 */
export const POST = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();
  const campaignService = new CampaignService(db);

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  // Verify ownership
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  if (!isOwner) {
    throw BizError.forbidden('You do not have permission to create campaigns for this listing');
  }

  const ownerUserId = ownershipResult.rows[0]?.user_id;
  if (!ownerUserId) {
    throw BizError.badRequest('Invalid listing ownership data');
  }

  // Parse request body
  const body = await context.request.json();

  // Validate required fields
  if (!body.title || !body.campaign_type || !body.budget || !body.start_date || !body.end_date) {
    throw BizError.badRequest('Missing required fields: title, campaign_type, budget, start_date, end_date');
  }

  // Create campaign
  const campaign = await campaignService.createCampaign({
    user_id: ownerUserId,
    campaign_type: body.campaign_type,
    title: body.title,
    description: body.description,
    target_audience: body.target_audience,
    budget: parseFloat(body.budget),
    daily_budget: body.daily_budget ? parseFloat(body.daily_budget) : undefined,
    start_date: new Date(body.start_date),
    end_date: new Date(body.end_date),
    creatives: body.creatives
  });

  return createSuccessResponse(campaign, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
