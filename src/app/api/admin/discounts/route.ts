/**
 * Admin Discounts API Routes
 *
 * GET /api/admin/discounts - Get all offers/discounts
 * POST /api/admin/discounts - Create discount code
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: OfferService
 *
 * @authority CLAUDE.md - API Standards
 * @authority admin-build-map-v2.1.mdc - Admin API patterns
 */

import { getOfferService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/**
 * GET /api/admin/discounts
 * Get all offers/discounts with optional filters and pagination
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin discounts', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const offerType = searchParams.get('offer_type');
  const status = searchParams.get('status');
  const searchQuery = searchParams.get('q');

  const filters: Record<string, unknown> = {};
  if (offerType) filters.offerType = offerType;
  if (status) filters.status = status;
  if (searchQuery) filters.searchQuery = searchQuery;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const offerService = getOfferService();

  // Get offers with filters
  const result = await offerService.getAll(filters, pagination);

  return createSuccessResponse({
    discounts: result.data,
    pagination: result.pagination
  }, 200);
});

/**
 * POST /api/admin/discounts
 * Create new discount code (placeholder for future implementation)
 */
export const POST = withCsrf(apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('create discount', 'admin');
  }

  // Future: Implement discount/offer creation
  throw BizError.serviceUnavailable('Discount creation not yet implemented');
}));
