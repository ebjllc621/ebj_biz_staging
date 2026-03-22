/**
 * Billing Refund Request Detail API Route
 * GET /api/billing/refund-request/[id] - Get a single refund request (scoped to user)
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4
 * @tier ENTERPRISE (billing data)
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { RefundService } from '@core/services/RefundService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/billing/refund-request/[id]
 * Get a single refund request — scoped to authenticated user (IDOR prevention)
 *
 * @authenticated Required
 * @csrf Not required (read-only)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    return createErrorResponse(BizError.unauthorized('Authentication required'), context.requestId);
  }

  const url = new URL((context.request as NextRequest).url);
  const segments = url.pathname.split('/');
  const idSegment = segments[segments.length - 1] ?? '';
  const id = parseInt(idSegment, 10);

  if (isNaN(id)) {
    throw BizError.validation('id', idSegment, 'id must be a valid integer');
  }

  const db = getDatabaseService();
  const refundService = new RefundService(db);

  // Pass userId for IDOR scoping
  const refundRequest = await refundService.getRefundById(id, user.id);

  return createSuccessResponse({ refund_request: refundRequest }, context.requestId);
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
