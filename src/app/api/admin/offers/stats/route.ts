/**
 * Admin Offer Stats API Route
 * GET /api/admin/offers/stats - Get aggregate offer statistics
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: OfferService
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 8A - Admin Stats Bug Fix
 * @tier STANDARD
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/offers/stats
 * Get aggregate offer statistics for admin dashboard
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access admin offer stats', 'admin');

  const offerService = getOfferService();
  const stats = await offerService.getAdminStats();
  return createSuccessResponse(stats, 200);
});
