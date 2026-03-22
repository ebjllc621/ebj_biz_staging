/**
 * Admin Campaign Banks API Route
 * GET /api/admin/billing/campaign-banks - Paginated list (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { campaign_banks: [], pagination: {} }
 * - bigIntToNumber: MANDATORY for COUNT results (handled in service)
 * - parseFloat: MANDATORY for decimal columns (handled in service)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { CampaignBankService } from '@core/services/CampaignBankService';

/**
 * GET /api/admin/billing/campaign-banks
 * Returns a paginated list of all campaign banks with user and listing info.
 *
 * Query params:
 *   page       - Page number (default 1)
 *   pageSize   - Items per page (default 20, max 100)
 *   user_id    - Filter by user ID
 *   status     - Filter by status (active|frozen|depleted)
 */
export const GET = apiHandler(async (context) => {
  // Authentication
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const url = new URL(context.request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const userIdParam = url.searchParams.get('user_id');
  const status = url.searchParams.get('status') || undefined;

  const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

  if (userId !== undefined && isNaN(userId)) {
    throw BizError.validation('user_id', userIdParam, 'user_id must be a valid integer');
  }

  const db = getDatabaseService();
  const service = new CampaignBankService(db);

  const { items, total } = await service.getAdminBankList({ page, pageSize, userId, status });

  return createSuccessResponse({
    campaign_banks: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
});
