/**
 * Public Jobs API Route
 *
 * GET /api/jobs - Get all active jobs for public directory
 * POST /api/jobs - Create a community gig (authenticated users)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse
 * - Service boundary: JobService
 * - GET: Public access (no auth required)
 * - POST: Authenticated users only (community gigs)
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 5 - Community Gig Board
 */

import { getJobService } from '@core/services/ServiceRegistry';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { JobStatus } from '@features/jobs/types';

/**
 * GET /api/jobs
 * Get all active jobs with optional filters and pagination for public directory
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Parse filters
  const employmentType = searchParams.get('employment_type');
  const compensationType = searchParams.get('compensation_type');
  const workLocationType = searchParams.get('work_location_type');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const searchQuery = searchParams.get('q');
  const minCompensation = searchParams.get('min_compensation');
  const maxCompensation = searchParams.get('max_compensation');
  const postedWithinDays = searchParams.get('posted_within_days');
  const isCommunityGig = searchParams.get('is_community_gig');
  const myGigs = searchParams.get('my_gigs');

  const filters: Record<string, unknown> = {
    status: JobStatus.ACTIVE, // Only show active jobs publicly
    isActive: true // Not expired
  };

  // my_gigs=true: show the current user's community gigs (any status)
  if (myGigs === 'true') {
    const user = await getUserFromRequest(request);
    if (user) {
      filters.creatorUserId = user.id;
      filters.isCommunityGig = true;
      // Show all statuses for the user's own gigs, not just active
      delete filters.status;
      delete filters.isActive;
    }
  }

  if (employmentType) filters.employmentType = employmentType;
  if (compensationType) filters.compensationType = compensationType;
  if (workLocationType) filters.workLocationType = workLocationType;
  if (city) filters.city = city;
  if (state) filters.state = state;
  if (searchQuery) filters.searchQuery = searchQuery;
  if (minCompensation) filters.minCompensation = parseFloat(minCompensation);
  if (maxCompensation) filters.maxCompensation = parseFloat(maxCompensation);
  if (postedWithinDays) filters.postedWithinDays = parseInt(postedWithinDays);
  if (isCommunityGig !== null) filters.isCommunityGig = isCommunityGig === 'true';

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const pagination = { page, limit };

  // Initialize services
  const jobService = getJobService();

  // Get jobs with filters
  const result = await jobService.getAll(filters, pagination);

  return createSuccessResponse({
    jobs: result.data,
    pagination: result.pagination
  }, 200);
});

/**
 * POST /api/jobs
 * Create a community gig (authenticated users only)
 * Community gigs are submitted with status=pending_moderation for admin review
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Only community gigs are accepted via this route
  if (!requestBody.is_community_gig) {
    throw BizError.badRequest('Only community gigs can be submitted via this route');
  }

  if (!requestBody.title || typeof requestBody.title !== 'string' || !requestBody.title.trim()) {
    throw BizError.validation('title', requestBody.title, 'Title is required');
  }

  if (!requestBody.employment_type || typeof requestBody.employment_type !== 'string') {
    throw BizError.validation('employment_type', requestBody.employment_type, 'Employment type is required');
  }

  if (!requestBody.compensation_type || typeof requestBody.compensation_type !== 'string') {
    throw BizError.validation('compensation_type', requestBody.compensation_type, 'Compensation type is required');
  }

  if (!requestBody.work_location_type || typeof requestBody.work_location_type !== 'string') {
    throw BizError.validation('work_location_type', requestBody.work_location_type, 'Work location type is required');
  }

  if (!requestBody.application_method || typeof requestBody.application_method !== 'string') {
    throw BizError.validation('application_method', requestBody.application_method, 'Application method is required');
  }

  const jobService = getJobService();

  const job = await jobService.createCommunityGig(user.id, {
    title: (requestBody.title as string).trim(),
    description: typeof requestBody.description === 'string' ? requestBody.description.trim() : '',
    employment_type: requestBody.employment_type as string,
    compensation_type: requestBody.compensation_type as string,
    compensation_min: typeof requestBody.compensation_min === 'number' ? requestBody.compensation_min : undefined,
    compensation_max: typeof requestBody.compensation_max === 'number' ? requestBody.compensation_max : undefined,
    work_location_type: requestBody.work_location_type as string,
    city: typeof requestBody.city === 'string' ? requestBody.city.trim() : undefined,
    state: typeof requestBody.state === 'string' ? requestBody.state.trim() : undefined,
    application_method: requestBody.application_method as string,
    external_application_url: typeof requestBody.external_application_url === 'string' ? requestBody.external_application_url.trim() : undefined,
    application_deadline: typeof requestBody.application_deadline === 'string' ? requestBody.application_deadline : undefined,
    schedule_info: typeof requestBody.schedule_info === 'string' ? requestBody.schedule_info.trim() : undefined,
    contact_email: typeof requestBody.contact_email === 'string' ? requestBody.contact_email.trim() : undefined,
    contact_phone: typeof requestBody.contact_phone === 'string' ? requestBody.contact_phone.trim() : undefined,
  });

  return createSuccessResponse({ job }, 201);
}));
