/**
 * Admin Jobs API Route
 *
 * GET /api/admin/jobs - Get all jobs with admin features
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse
 * - Service boundary: JobService
 *
 * @authority CLAUDE.md - API Standards
 * @authority admin-build-map-v2.1.mdc - Admin API patterns
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/jobs
 * Get all jobs with optional filters and pagination for admin management
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // GOVERNANCE: Admin authentication check
  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('access admin jobs', 'admin');
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const employmentType = searchParams.get('employment_type');
  const compensationType = searchParams.get('compensation_type');
  const workLocationType = searchParams.get('work_location_type');
  const status = searchParams.get('status');
  const searchQuery = searchParams.get('q');
  const listingId = searchParams.get('listing_id');

  const filters: Record<string, unknown> = {};
  if (employmentType) filters.employmentType = employmentType;
  if (compensationType) filters.compensationType = compensationType;
  if (workLocationType) filters.workLocationType = workLocationType;
  if (status) filters.status = status;
  if (searchQuery) filters.searchQuery = searchQuery;
  if (listingId) filters.listingId = parseInt(listingId);

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const jobService = getJobService();

  // Get jobs with filters (admin can see all statuses)
  const result = await jobService.getAll(filters, pagination);

  return createSuccessResponse({
    jobs: result.data,
    pagination: result.pagination
  }, 200);
});
