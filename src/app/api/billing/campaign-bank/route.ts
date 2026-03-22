/**
 * Campaign Bank API Route
 * GET  /api/billing/campaign-bank - List user's campaign banks
 * POST /api/billing/campaign-bank - Deposit to a campaign bank
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { CampaignBankService } from '@core/services/CampaignBankService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/campaign-bank
 * List all campaign banks for the authenticated user.
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

  const db = getDatabaseService();
  const service = new CampaignBankService(db);

  const items = await service.getBanksForUser(user.id);

  return createSuccessResponse({ items }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
});

/**
 * POST /api/billing/campaign-bank
 * Deposit funds into a listing's campaign bank.
 *
 * Body: { listing_id: number, amount: number, description?: string }
 *
 * @authenticated Required
 * @csrf Required (state-changing)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await (context.request as NextRequest).json() as {
    listing_id?: unknown;
    amount?: unknown;
    description?: unknown;
  };

  const listingId = typeof body.listing_id === 'number' ? body.listing_id : parseInt(String(body.listing_id), 10);
  const amount = typeof body.amount === 'number' ? body.amount : parseFloat(String(body.amount));
  const description = typeof body.description === 'string' ? body.description : undefined;

  if (!body.listing_id || isNaN(listingId)) {
    throw BizError.validation('listing_id', body.listing_id, 'listing_id must be a valid integer');
  }

  if (!body.amount || isNaN(amount) || amount <= 0) {
    throw BizError.validation('amount', body.amount, 'amount must be a positive number');
  }

  const db = getDatabaseService();
  const service = new CampaignBankService(db);

  const campaignBank = await service.deposit(user.id, { listingId, amount, description });

  return createSuccessResponse({ campaign_bank: campaignBank }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST']
}));
