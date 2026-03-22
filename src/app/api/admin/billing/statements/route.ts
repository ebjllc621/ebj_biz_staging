/**
 * Admin Billing Statements API Route
 * GET  /api/admin/billing/statements - Paginated statement list (admin only)
 * POST /api/admin/billing/statements - Generate statement for user/month (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response key: `statements` (explicit, NOT `items`)
 * - bigIntToNumber: MANDATORY for COUNT results
 * - parseFloat: MANDATORY for decimal columns
 * - CSRF: MANDATORY on POST (state-changing)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 5
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import { withCsrf } from '@/lib/security/withCsrf';
import { BillingReceiptService } from '@core/services/BillingReceiptService';
import type { MonthlyStatementRow } from '@core/types/db-rows';

interface AdminStatementRow extends MonthlyStatementRow {
  user_email: string;
  user_name: string | null;
}

/**
 * GET /api/admin/billing/statements
 * Returns paginated list of all monthly statements with user info.
 *
 * Query params:
 *   page      - Page number (default 1)
 *   pageSize  - Items per page (default 20, max 100)
 *   user_id   - Filter by user
 *   month     - Filter by statement month (YYYY-MM)
 *   status    - Filter by status (draft|sent|paid)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const url = new URL((context.request as NextRequest).url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  const filterUserId = url.searchParams.get('user_id') || null;
  const filterMonth = url.searchParams.get('month') || null;
  const filterStatus = url.searchParams.get('status') || null;
  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();
  const receiptService = new BillingReceiptService();

  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (filterUserId) {
    conditions.push('ms.user_id = ?');
    params.push(parseInt(filterUserId, 10));
  }
  if (filterMonth) {
    conditions.push('ms.statement_month = ?');
    params.push(filterMonth);
  }
  if (filterStatus) {
    conditions.push('ms.status = ?');
    params.push(filterStatus);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count
     FROM monthly_statements ms
     JOIN users u ON ms.user_id = u.id
     WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

  const dataResult = await db.query<AdminStatementRow>(
    `SELECT
       ms.*,
       u.email as user_email,
       u.display_name as user_name
     FROM monthly_statements ms
     JOIN users u ON ms.user_id = u.id
     WHERE ${whereClause}
     ORDER BY ms.statement_month DESC, ms.user_id ASC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const statements = dataResult.rows.map(row => ({
    ...receiptService.mapRowToStatement(row),
    userEmail: row.user_email,
    userName: row.user_name
  }));

  return createSuccessResponse({
    statements,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
});

/**
 * POST /api/admin/billing/statements
 * Generate (or regenerate) a statement for a user/month by aggregating transactions.
 *
 * Body: { user_id: number, month: string }
 *
 * @csrf Required (state-changing)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const body = await (context.request as NextRequest).json() as { user_id?: unknown; month?: unknown };
  const targetUserId = typeof body.user_id === 'number' ? body.user_id : parseInt(String(body.user_id), 10);
  const month = typeof body.month === 'string' ? body.month : '';

  if (isNaN(targetUserId) || targetUserId <= 0) {
    throw BizError.validation('user_id', body.user_id, 'user_id must be a valid positive integer');
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw BizError.validation('month', month, 'month must be in YYYY-MM format');
  }

  const db = getDatabaseService();
  const receiptService = new BillingReceiptService();

  // Aggregate billing_transactions by transaction_type for the user/month
  type AggRow = { transaction_type: string; total: string };
  const aggResult = await db.query<AggRow>(
    `SELECT transaction_type, SUM(amount) as total
     FROM billing_transactions
     WHERE user_id = ? AND statement_month = ?
     GROUP BY transaction_type`,
    [targetUserId, month]
  );

  let subscriptionCharges = 0;
  let addonCharges = 0;
  let campaignBankDeposits = 0;
  let campaignBankSpend = 0;
  let refunds = 0;
  let credits = 0;
  let adjustments = 0;

  for (const row of aggResult.rows) {
    const amount = parseFloat(row.total) || 0;
    switch (row.transaction_type) {
      case 'subscription':
      case 'subscription_upgrade':
      case 'subscription_downgrade':
        subscriptionCharges += amount;
        break;
      case 'addon':
        addonCharges += amount;
        break;
      case 'campaign_bank_deposit':
        campaignBankDeposits += amount;
        break;
      case 'campaign_bank_spend':
        campaignBankSpend += amount;
        break;
      case 'refund':
        refunds += amount;
        break;
      case 'credit':
        credits += amount;
        break;
      case 'adjustment':
        adjustments += amount;
        break;
      default:
        break;
    }
  }

  const totalCharges = subscriptionCharges + addonCharges + campaignBankDeposits + campaignBankSpend
    - refunds - credits + adjustments;

  // Upsert with ON DUPLICATE KEY UPDATE (user+month is UNIQUE)
  await db.query(
    `INSERT INTO monthly_statements
       (user_id, statement_month, subscription_charges, addon_charges, campaign_bank_deposits,
        campaign_bank_spend, refunds, credits, adjustments, total_charges, amount_due, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
     ON DUPLICATE KEY UPDATE
       subscription_charges = VALUES(subscription_charges),
       addon_charges = VALUES(addon_charges),
       campaign_bank_deposits = VALUES(campaign_bank_deposits),
       campaign_bank_spend = VALUES(campaign_bank_spend),
       refunds = VALUES(refunds),
       credits = VALUES(credits),
       adjustments = VALUES(adjustments),
       total_charges = VALUES(total_charges),
       amount_due = VALUES(amount_due),
       updated_at = current_timestamp()`,
    [
      targetUserId, month,
      subscriptionCharges, addonCharges, campaignBankDeposits,
      campaignBankSpend, refunds, credits, adjustments, totalCharges,
      totalCharges
    ]
  );

  const statementResult = await db.query<MonthlyStatementRow>(
    `SELECT * FROM monthly_statements WHERE user_id = ? AND statement_month = ?`,
    [targetUserId, month]
  );

  const statementRow = statementResult.rows[0];
  if (!statementRow) {
    throw BizError.notFound('Statement', `${targetUserId}/${month}`);
  }
  const statement = receiptService.mapRowToStatement(statementRow);

  return createSuccessResponse({ statement }, context.requestId);
}));
