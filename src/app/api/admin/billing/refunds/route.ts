/**
 * Admin Billing Refunds API Route
 * GET /api/admin/billing/refunds - Paginated refund queue (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { refunds: [], pagination: {} }
 * - bigIntToNumber: via RefundService (internal)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { RefundService } from '@core/services/RefundService';

/**
 * GET /api/admin/billing/refunds
 * Returns paginated refund queue with requester info.
 *
 * Query params:
 *   status    - Filter by refund status
 *   page      - Page number (default 1)
 *   pageSize  - Items per page (default 20, max 100)
 *   search    - Search by requester email/name or reason
 */
export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
  const search = url.searchParams.get('search') || undefined;

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  const result = await refundService.getRefundQueue({ status, page, pageSize, search });

  return createSuccessResponse(result, context.requestId);
});
