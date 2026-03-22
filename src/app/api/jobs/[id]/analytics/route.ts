/**
 * Job Analytics Tracking API Route
 *
 * POST /api/jobs/[id]/analytics - Track analytics event
 * GET /api/jobs/[id]/analytics - Get analytics funnel data
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Direct database operations for job_analytics table
 * - Public access (optional auth) for POST, authenticated for GET
 *
 * @authority CLAUDE.md - API Standards
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @phase Jobs Phase 3 - SEO & Analytics (GET method)
 */

import { getDatabaseService, getJobService, getListingService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { bigIntToNumber } from '@core/utils/bigint';
import type { AnalyticsEventType, AnalyticsSource } from '@features/jobs/types';

interface AnalyticsRequestBody {
  event_type: AnalyticsEventType;
  source?: AnalyticsSource;
  referrer?: string;
}

/**
 * POST /api/jobs/[id]/analytics
 * Track analytics event for a job (impressions, views, clicks, etc.)
 */
export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/analytics

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  // Verify job exists
  const jobService = getJobService();
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Parse request body
  let body: AnalyticsRequestBody;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  if (!body.event_type) {
    return createErrorResponse('event_type is required', 400);
  }

  // Validate event_type
  const validEventTypes: AnalyticsEventType[] = [
    'impression',
    'page_view',
    'save',
    'share',
    'external_click',
    'apply_click'
  ];

  if (!validEventTypes.includes(body.event_type)) {
    return createErrorResponse('Invalid event_type', 400);
  }

  // Validate source (must match database ENUM constraint)
  // GOVERNANCE: source column in job_analytics is ENUM('search','notification','direct','social','listing','homepage')
  const validSources: AnalyticsSource[] = [
    'search',
    'notification',
    'direct',
    'social',
    'listing',
    'homepage'
  ];

  if (body.source && !validSources.includes(body.source)) {
    console.warn(`[JobAPI] Invalid source value: '${body.source}' - must be one of: ${validSources.join(', ')}`);
    // Sanitize invalid source to null rather than failing the INSERT
    body.source = undefined;
  }

  // Get user ID if authenticated (optional)
  const user = await getUserFromRequest(request);
  const userId = user?.id || null;

  // Insert analytics event with server-side deduplication
  const db = getDatabaseService();
  try {
    // For high-frequency events (page_view, impression), check for recent duplicates
    // This prevents double-counting from React StrictMode, tab refreshes, or rapid re-renders
    if (body.event_type === 'page_view' || body.event_type === 'impression') {
      const recentDuplicate = await db.query<{ count: bigint }>(
        `SELECT COUNT(*) as count FROM job_analytics
         WHERE job_id = ? AND event_type = ?
         AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))
         AND created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)`,
        [jobId, body.event_type, userId, userId]
      );

      if (bigIntToNumber(recentDuplicate.rows[0]?.count ?? 0) > 0) {
        // Duplicate detected - silently succeed without inserting
        return createSuccessResponse({
          message: 'Analytics event tracked',
          event_type: body.event_type,
          job_id: jobId,
          deduplicated: true
        }, 200);
      }
    }

    await db.query(
      `INSERT INTO job_analytics (job_id, event_type, user_id, source, referrer)
       VALUES (?, ?, ?, ?, ?)`,
      [
        jobId,
        body.event_type,
        userId,
        body.source || null,
        body.referrer || null
      ]
    );

    // Update denormalized counters on job_postings table for card display
    if (body.event_type === 'page_view') {
      await db.query(
        'UPDATE job_postings SET view_count = view_count + 1 WHERE id = ?',
        [jobId]
      );
    } else if (body.event_type === 'apply_click') {
      await db.query(
        'UPDATE job_postings SET application_count = application_count + 1 WHERE id = ?',
        [jobId]
      );
    }
  } catch (error) {
    console.error('[JobAPI] Failed to track analytics:', error);
    return createErrorResponse('Failed to track analytics', 500);
  }

  return createSuccessResponse({
    message: 'Analytics event tracked',
    event_type: body.event_type,
    job_id: jobId
  }, 200);
});

/**
 * GET /api/jobs/[id]/analytics
 * Get analytics funnel data for a job (Phase 3)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract job ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // .../jobs/[id]/analytics

  if (!id) {
    return createErrorResponse('Job ID is required', 400);
  }

  const jobId = parseInt(id);
  if (isNaN(jobId)) {
    return createErrorResponse('Invalid job ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const jobService = getJobService();

  // Validate job exists and user owns the listing
  const job = await jobService.getById(jobId);
  if (!job) {
    return createErrorResponse('Job not found', 404);
  }

  // Verify ownership or admin
  if (user.role !== 'admin') {
    if (job.business_id) {
      const listingService = getListingService();
      const listing = await listingService.getById(job.business_id);
      if (!listing || listing.user_id !== user.id) {
        return createErrorResponse('You do not have permission to view analytics for this job', 403);
      }
    } else if (job.creator_user_id !== user.id) {
      return createErrorResponse('You do not have permission to view analytics for this job', 403);
    }
  }

  const funnel = await jobService.getJobAnalyticsFunnel(jobId);
  const shares = await jobService.getSharesByPlatform(jobId);
  const hires = await jobService.getHiresByJob(jobId);

  // Get referral count from user_referrals table for this job
  // Note: Recommendation system stores job_id in entity_id (string) when entity_type = 'job_posting'
  const db = getDatabaseService();
  const referralResult = await db.query<{ count: bigint }>(
    "SELECT COUNT(*) as count FROM user_referrals WHERE entity_type = 'job_posting' AND entity_id = ?",
    [String(jobId)]
  );
  const referrals = bigIntToNumber(referralResult.rows[0]?.count ?? 0);

  return createSuccessResponse({
    funnel,
    shares,
    hires,
    referrals,
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      created_at: job.created_at
    }
  });
});
