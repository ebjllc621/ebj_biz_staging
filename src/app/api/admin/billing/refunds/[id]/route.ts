/**
 * Admin Billing Refund Detail API Route
 * GET /api/admin/billing/refunds/[id] - Single refund detail with audit trail (admin only)
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
 * GET /api/admin/billing/refunds/[id]
 * Returns full refund detail plus the complete audit trail.
 *
 * @admin Required
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
  const segments = url.pathname.split('/');
  const idSegment = segments[segments.length - 1] ?? '';
  const id = parseInt(idSegment, 10);

  if (isNaN(id)) {
    throw BizError.validation('id', idSegment, 'id must be a valid integer');
  }

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  // Admin access — no userId scoping
  const [refund, auditTrail] = await Promise.all([
    refundService.getRefundById(id),
    refundService.getAuditTrail(id)
  ]);

  return createSuccessResponse({ refund, audit_trail: auditTrail }, context.requestId);
});
