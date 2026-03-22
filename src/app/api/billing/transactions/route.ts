/**
 * Billing Transactions API Route
 * GET /api/billing/transactions - List billing transactions for authenticated user
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 2
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BillingService } from '@core/services/BillingService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/transactions
 * List paginated billing transactions for the authenticated user
 * Query params: listing_id (optional), page (default 1), pageSize (default 20)
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

  const listingIdParam = url.searchParams.get('listing_id');
  const pageParam = url.searchParams.get('page');
  const pageSizeParam = url.searchParams.get('pageSize');

  const listingId = listingIdParam ? parseInt(listingIdParam, 10) : undefined;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 20;

  if (listingId !== undefined && isNaN(listingId)) {
    throw BizError.validation('listing_id', listingIdParam, 'listing_id must be a valid integer');
  }

  if (isNaN(page) || page < 1) {
    throw BizError.validation('page', pageParam, 'page must be a positive integer');
  }

  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw BizError.validation('pageSize', pageSizeParam, 'pageSize must be between 1 and 100');
  }

  const db = getDatabaseService();
  const service = new BillingService(db);

  const { items, total } = await service.getTransactionsForUser(user.id, {
    listingId,
    page,
    pageSize
  });

  const totalPages = Math.ceil(total / pageSize);

  return createSuccessResponse({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
