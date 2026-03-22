/**
 * Billing Statement Detail API Route
 * GET /api/billing/statements/[month] - Single statement + transactions for a month
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: requireAuth (user.id scoped)
 * - Month format validation: YYYY-MM regex
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { BillingReceiptService } from '@core/services/BillingReceiptService';
import type { MonthlyStatementRow } from '@core/types/db-rows';
import type { BillingTransactionRow } from '@core/types/db-rows';
import { BillingService } from '@core/services/BillingService';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * GET /api/billing/statements/[month]
 * Returns a single statement with transaction detail for the authenticated user.
 *
 * URL param:
 *   month - Statement month in YYYY-MM format (e.g. "2026-03")
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL((context.request as NextRequest).url);
  const segments = url.pathname.split('/');
  const month = segments[segments.length - 1];

  if (!month || !MONTH_REGEX.test(month)) {
    throw BizError.validation('month', month, 'Month must be in YYYY-MM format');
  }

  const db = getDatabaseService();
  const receiptService = new BillingReceiptService();
  const billingService = new BillingService(db);

  const statementResult = await db.query<MonthlyStatementRow>(
    `SELECT * FROM monthly_statements WHERE user_id = ? AND statement_month = ?`,
    [user.id, month]
  );

  const statementRow = statementResult.rows[0];
  if (!statementRow) {
    throw BizError.notFound('Statement', month);
  }

  const statement = receiptService.mapRowToStatement(statementRow);

  // Query transactions for this month directly (BillingService doesn't filter by statementMonth)
  const txResult = await db.query<BillingTransactionRow>(
    `SELECT * FROM billing_transactions
     WHERE user_id = ? AND statement_month = ?
     ORDER BY transaction_date DESC
     LIMIT 100`,
    [user.id, month]
  );

  const transactions = txResult.rows.map(row => billingService.mapRowToTransaction(row));

  return createSuccessResponse({ statement, transactions }, context.requestId);
});
