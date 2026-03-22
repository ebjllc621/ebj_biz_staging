/**
 * Campaign Bank Detail API Route
 * GET /api/billing/campaign-bank/[listingId] - Get specific listing's campaign bank
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { CampaignBankService } from '@core/services/CampaignBankService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/campaign-bank/[listingId]
 * Get the campaign bank for a specific listing owned by the authenticated user.
 *
 * @authenticated Required
 * @csrf Not required (read-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const url = new URL((context.request as NextRequest).url);
  const pathParts = url.pathname.split('/');
  const listingIdParam = pathParts[pathParts.length - 1] ?? '';
  const listingId = parseInt(listingIdParam, 10);

  if (isNaN(listingId) || listingId <= 0) {
    throw BizError.validation('listingId', listingIdParam, 'listingId must be a valid positive integer');
  }

  const db = getDatabaseService();
  const service = new CampaignBankService(db);

  const campaignBank = await service.getBalance(user.id, listingId);

  return createSuccessResponse({ campaign_bank: campaignBank }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
