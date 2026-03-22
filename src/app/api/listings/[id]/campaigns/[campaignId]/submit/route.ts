/**
 * POST /api/listings/[id]/campaigns/[campaignId]/submit - Submit Campaign for Approval
 *
 * @tier API_ROUTE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper
 * - MUST use CampaignService.submitForApproval()
 * - MUST authorize: user owns campaign
 * - MUST validate campaign is in 'draft' status
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { CampaignService } from '@core/services/CampaignService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * POST handler - Submit campaign for admin approval
 */
export const POST = apiHandler(async (context: ApiContext) => {
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
    throw BizError.forbidden('You do not have permission to submit this campaign');
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

  // Verify campaign is in draft status
  if (existingCampaign.status !== 'draft') {
    throw BizError.badRequest(`Campaign cannot be submitted. Current status: ${existingCampaign.status}`);
  }

  // Submit for approval
  const submittedCampaign = await campaignService.submitForApproval(campaignId);

  return createSuccessResponse(submittedCampaign, context.requestId);
}, {
  allowedMethods: ['POST'],
  requireAuth: true
});
