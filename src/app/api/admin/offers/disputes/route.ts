/**
 * GET /api/admin/offers/disputes
 *
 * Admin endpoint to retrieve all platform-wide offer disputes.
 *
 * @tier STANDARD
 * @phase Phase 6 - Dispute Resolution
 * @authority CLAUDE.md - API Standards, Admin API
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only with role check
 * - Response format: createSuccessResponse (flat, no double-nesting)
 * - Service boundary: OfferService via ServiceRegistry
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/offers/disputes
 * Returns all disputes with optional status filter and pagination.
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access offer disputes', 'admin');
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);
  const offset = (page - 1) * limit;

  const offerService = getOfferService();
  const { disputes, total } = await offerService.getAllDisputes({ status, limit, offset });

  return createSuccessResponse({ items: disputes, total, page, limit });
});
