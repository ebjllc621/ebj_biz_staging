/**
 * Admin Billing Transactions API Route
 * GET /api/admin/billing/transactions - Paginated transaction list (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only (user.role === 'admin')
 * - Response format: { transactions: [], pagination: {} }
 * - bigIntToNumber: MANDATORY for COUNT results
 * - parseFloat: MANDATORY for amount/tax_amount/tax_rate (mariadb returns as strings)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 3A
 */

import { NextRequest } from 'next/server';
import { apiHandler, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';

interface TransactionRow {
  id: number;
  invoice_number: string | null;
  transaction_type: string;
  status: string;
  amount: string | number;
  tax_amount: string | number | null;
  tax_rate: string | number | null;
  description: string | null;
  transaction_date: Date | string;
  statement_month: string | null;
  user_id: number;
  listing_id: number | null;
  user_email: string;
  user_name: string | null;
  listing_name: string | null;
}

/**
 * GET /api/admin/billing/transactions
 * Returns a paginated list of all billing transactions with user and listing info.
 *
 * Query params:
 *   page       - Page number (default 1)
 *   pageSize   - Items per page (default 20, max 100)
 *   type       - Filter by transaction_type
 *   status     - Filter by transaction status
 *   search     - Search by invoice_number, user email, or description
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
  const type = url.searchParams.get('type') || null;
  const status = url.searchParams.get('status') || null;
  const search = url.searchParams.get('search') || null;

  const offset = (page - 1) * pageSize;

  const db = getDatabaseService();

  // Build WHERE clause dynamically
  const conditions: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (type) {
    conditions.push('bt.transaction_type = ?');
    params.push(type);
  }

  if (status) {
    conditions.push('bt.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(bt.invoice_number LIKE ? OR u.email LIKE ? OR bt.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countResult = await db.query<{ count: bigint | number }>(
    `SELECT COUNT(*) as count
     FROM billing_transactions bt
     JOIN users u ON bt.user_id = u.id
     LEFT JOIN listings l ON bt.listing_id = l.id
     WHERE ${whereClause}`,
    params
  );
  const total = bigIntToNumber(countResult.rows[0]?.count ?? 0);

  // Data query
  const dataResult = await db.query<TransactionRow>(
    `SELECT
       bt.id,
       bt.invoice_number,
       bt.transaction_type,
       bt.status,
       bt.amount,
       bt.tax_amount,
       bt.tax_rate,
       bt.description,
       bt.transaction_date,
       bt.statement_month,
       bt.user_id,
       bt.listing_id,
       u.email as user_email,
       u.display_name as user_name,
       l.name as listing_name
     FROM billing_transactions bt
     JOIN users u ON bt.user_id = u.id
     LEFT JOIN listings l ON bt.listing_id = l.id
     WHERE ${whereClause}
     ORDER BY bt.transaction_date DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  // Convert decimal string columns to numbers
  const transactions = dataResult.rows.map((row) => ({
    ...row,
    amount: parseFloat(String(row.amount)) || 0,
    tax_amount: row.tax_amount !== null ? parseFloat(String(row.tax_amount)) : null,
    tax_rate: row.tax_rate !== null ? parseFloat(String(row.tax_rate)) : null
  }));

  return createSuccessResponse({
    transactions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  }, context.requestId);
});
