/**
 * Jobs Search API Route
 *
 * GET /api/jobs/search - Search jobs with advanced filters
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: JobService
 * - Public access (no auth required)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { JobStatus } from '@features/jobs/types';

/**
 * GET /api/jobs/search
 * Search jobs with advanced filtering and pagination
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse all filter parameters
  const employmentType = searchParams.get('employment_type');
  const compensationType = searchParams.get('compensation_type');
  const workLocationType = searchParams.get('work_location_type');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const searchQuery = searchParams.get('q');
  const minCompensation = searchParams.get('min_compensation');
  const maxCompensation = searchParams.get('max_compensation');
  const postedWithinDays = searchParams.get('posted_within_days');
  const isFeatured = searchParams.get('is_featured');
  const listingId = searchParams.get('listing_id');

  const filters: Record<string, unknown> = {
    status: JobStatus.ACTIVE,
    isActive: true
  };

  if (employmentType) filters.employmentType = employmentType;
  if (compensationType) filters.compensationType = compensationType;
  if (workLocationType) filters.workLocationType = workLocationType;
  if (city) filters.city = city;
  if (state) filters.state = state;
  if (searchQuery) filters.searchQuery = searchQuery;
  if (minCompensation) filters.minCompensation = parseFloat(minCompensation);
  if (maxCompensation) filters.maxCompensation = parseFloat(maxCompensation);
  if (postedWithinDays) filters.postedWithinDays = parseInt(postedWithinDays);
  if (isFeatured) filters.isFeatured = isFeatured === 'true';
  if (listingId) filters.listingId = parseInt(listingId);

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const jobService = getJobService();

  // Search jobs with filters
  const result = await jobService.getAll(filters, pagination);

  return createSuccessResponse({
    jobs: result.data,
    pagination: result.pagination,
    filters: {
      employmentType,
      compensationType,
      workLocationType,
      city,
      state,
      minCompensation,
      maxCompensation,
      postedWithinDays,
      isFeatured
    }
  }, 200);
});
