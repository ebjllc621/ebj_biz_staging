/**
 * Billing Statements API Route
 * GET /api/billing/statements - List monthly statements for authenticated user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: requireAuth (user.id scoped)
 * - Response format: { items, pagination }
 * - bigIntToNumber: MANDATORY for COUNT results
 * - parseFloat via BillingReceiptService.mapRowToStatement
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { BillingReceiptService } from '@core/services/BillingReceiptService';
import type { MonthlyStatementRow } from '@core/types/db-rows';

/**
 * GET /api/billing/statements
 * Returns paginated monthly statements for the authenticated user.
 *
 * Query params:
 *   page     - Page number (default 1)
 *   pageSize - Items per page (default 20)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL((context.request as NextRequest).url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();
  const receiptService = new BillingReceiptService();

  const countResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count FROM monthly_statements WHERE user_id = ?`,
    [user.id]
  );
  const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

  const dataResult = await db.query<MonthlyStatementRow>(
    `SELECT * FROM monthly_statements
     WHERE user_id = ?
     ORDER BY statement_month DESC
     LIMIT ? OFFSET ?`,
    [user.id, pageSize, offset]
  );

  const items = dataResult.rows.map(row => receiptService.mapRowToStatement(row));

  return createSuccessResponse({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
});
