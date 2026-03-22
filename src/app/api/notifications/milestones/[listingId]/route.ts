/**
 * Milestones API Route - GET unnotified milestones + history, POST acknowledge
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 * @reference src/app/api/listings/[id]/broadcast/route.ts
 */

import { getMilestoneNotificationService } from '@core/services/MilestoneNotificationService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';

// ============================================================================
// GET - Get unnotified milestones + milestone history
// ============================================================================

export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Extract listingId from URL path: /api/notifications/milestones/[listingId]
  const segments = request.nextUrl.pathname.split('/');
  const listingIdStr = segments[segments.indexOf('milestones') + 1];
  const listingId = parseInt(listingIdStr ?? '', 10);

  if (isNaN(listingId) || listingId <= 0) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  // Verify ownership or admin access
  const db = getDatabaseService();
  const listingResult = await db.query(
    'SELECT claimant_user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (listingResult.rows.length === 0) {
    return createErrorResponse('Listing not found', 404);
  }

  const listing = listingResult.rows[0] as { claimant_user_id: number | null };
  const isOwner = listing?.claimant_user_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return createErrorResponse('Access denied', 403);
  }

  const service = getMilestoneNotificationService();
  const [milestones, history] = await Promise.all([
    service.getUnnotifiedMilestones(listingId),
    service.getMilestoneHistory(listingId)
  ]);

  return createSuccessResponse({ milestones, history });
});

// ============================================================================
// POST - Acknowledge milestone (mark as notified)
// ============================================================================

export const POST = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  // Extract listingId from URL
  const segments = request.nextUrl.pathname.split('/');
  const listingIdStr = segments[segments.indexOf('milestones') + 1];
  const listingId = parseInt(listingIdStr ?? '', 10);

  if (isNaN(listingId) || listingId <= 0) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  // Verify ownership
  const db = getDatabaseService();
  const listingResult = await db.query(
    'SELECT claimant_user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (listingResult.rows.length === 0) {
    return createErrorResponse('Listing not found', 404);
  }

  const listing = listingResult.rows[0] as { claimant_user_id: number | null };
  const isOwner = listing?.claimant_user_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return createErrorResponse('Access denied', 403);
  }

  // Parse body
  let body: { milestoneId?: unknown };
  try {
    body = await request.json() as { milestoneId?: unknown };
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const { milestoneId } = body;
  if (!milestoneId || typeof milestoneId !== 'number') {
    return createErrorResponse('milestoneId is required', 400);
  }

  const service = getMilestoneNotificationService();
  await service.markMilestoneNotified(milestoneId);

  return createSuccessResponse({ acknowledged: true });
});
