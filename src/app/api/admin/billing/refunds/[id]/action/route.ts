/**
 * Admin Billing Refund Action API Route
 * POST /api/admin/billing/refunds/[id]/action - Perform an action on a refund (admin only)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { RefundService } from '@core/services/RefundService';

/**
 * POST /api/admin/billing/refunds/[id]/action
 * Perform an administrative action on a refund request.
 *
 * Body: {
 *   action: 'approve' | 'deny' | 'process' | 'escalate',
 *   amount?: number,       // for approve — override approved amount
 *   notes?: string,        // for approve
 *   reason?: string        // for deny and escalate
 * }
 *
 * @admin Required
 * @csrf Required (state-changing POST)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  const url = new URL((context.request as NextRequest).url);
  const segments = url.pathname.split('/');
  // URL: /api/admin/billing/refunds/[id]/action → id is second-to-last
  const idSegment = segments[segments.length - 2] ?? '';
  const id = parseInt(idSegment, 10);

  if (isNaN(id)) {
    throw BizError.validation('id', idSegment, 'id must be a valid integer');
  }

  let body: Record<string, unknown>;
  try {
    body = await (context.request as NextRequest).json();
  } catch {
    throw BizError.badRequest('Invalid request body');
  }

  const action = body.action;
  if (!action || typeof action !== 'string') {
    throw BizError.validation('action', action, 'action is required: approve | deny | process | escalate');
  }

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  let refund;

  switch (action) {
    case 'approve': {
      const amount = body.amount !== undefined ? (body.amount as number) : undefined;
      const notes = body.notes ? (body.notes as string) : undefined;
      refund = await refundService.approveRefund(id, user.id, amount, notes);
      break;
    }
    case 'deny': {
      if (!body.reason || typeof body.reason !== 'string') {
        throw BizError.validation('reason', body.reason, 'reason is required for deny action');
      }
      refund = await refundService.denyRefund(id, user.id, body.reason);
      break;
    }
    case 'process': {
      refund = await refundService.processRefund(id, user.id);
      break;
    }
    case 'escalate': {
      if (!body.reason || typeof body.reason !== 'string') {
        throw BizError.validation('reason', body.reason, 'reason is required for escalate action');
      }
      refund = await refundService.escalateRefund(id, user.id, body.reason);
      break;
    }
    default:
      throw BizError.validation('action', action, 'action must be: approve | deny | process | escalate');
  }

  return createSuccessResponse({ refund }, context.requestId);
}, {
  allowedMethods: ['POST']
}));
