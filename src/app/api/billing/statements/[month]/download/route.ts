/**
 * Billing Statement PDF Download Route
 * GET /api/billing/statements/[month]/download - Download PDF statement
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: requireAuth (user.id scoped)
 * - Returns raw Response with PDF headers (NOT createSuccessResponse)
 * - Month format validation: YYYY-MM regex
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { BillingReceiptService } from '@core/services/BillingReceiptService';
import { BillingService } from '@core/services/BillingService';
import type { MonthlyStatementRow } from '@core/types/db-rows';
import type { BillingTransactionRow } from '@core/types/db-rows';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

/**
 * GET /api/billing/statements/[month]/download
 * Generates and streams a PDF for the requested statement month.
 *
 * URL param:
 *   month - Statement month in YYYY-MM format (e.g. "2026-03")
 *
 * Returns: PDF binary with Content-Type: application/pdf
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  const url = new URL((context.request as NextRequest).url);
  const segments = url.pathname.split('/');
  // Path: /api/billing/statements/[month]/download — month is at index -2
  const month = segments[segments.length - 2];

  if (!month || !MONTH_REGEX.test(month)) {
    throw BizError.validation('month', month, 'Month must be in YYYY-MM format');
  }

  const db = getDatabaseService();
  const receiptService = new BillingReceiptService();
  const billingService = new BillingService(db);

  // Fetch statement
  const statementResult = await db.query<MonthlyStatementRow>(
    `SELECT * FROM monthly_statements WHERE user_id = ? AND statement_month = ?`,
    [user.id, month]
  );

  const statementRow = statementResult.rows[0];
  if (!statementRow) {
    throw BizError.notFound('Statement', month);
  }

  const statement = receiptService.mapRowToStatement(statementRow);

  // Fetch transactions for this month
  const txResult = await db.query<BillingTransactionRow>(
    `SELECT * FROM billing_transactions
     WHERE user_id = ? AND statement_month = ?
     ORDER BY transaction_date DESC
     LIMIT 100`,
    [user.id, month]
  );

  const transactions = txResult.rows.map(row => billingService.mapRowToTransaction(row));

  // Fetch user name and email (user object from session has both)
  const userName = user.name || user.email;
  const userEmail = user.email;

  // Generate PDF — convert to ArrayBuffer for Response (BodyInit compatible)
  const buffer = receiptService.generateMonthlyStatement(statement, transactions, userName, userEmail);
  // Copy into a guaranteed plain ArrayBuffer (avoids SharedArrayBuffer issues)
  const arrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);

  // Return raw PDF response (NOT createSuccessResponse — PDF binary)
  return new Response(arrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bizconekt-statement-${month}.pdf"`,
      'Content-Length': String(buffer.length)
    }
  });
});
