/**
 * Admin Listing Activity API Route
 * GET /api/admin/listings/[id]/activity - Get listing activity log
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: createSuccessResponse/createErrorResponse
 * - DatabaseService boundary compliance
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 8 - Activity Log Modal
 * @tier STANDARD
 */

import { getAdminActivityService } from '@core/services/AdminActivityService';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/listings/[id]/activity
 * Get listing activity log
 */
export const GET = apiHandler(async (context) => {
  // Verify admin authentication
  const currentUser = await getUserFromRequest(context.request as NextRequest);
  if (!currentUser) {
    throw BizError.unauthorized('Authentication required');
  }
  if (currentUser.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract listing ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Path: /api/admin/listings/[id]/activity
  // Index:  0    1     2        3    4
  const idIndex = pathParts.findIndex(part => part === 'listings') + 1;
  const id = pathParts[idIndex];

  if (!id) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(id);

  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID', { id });
  }

  // Get limit from query params (default 50, max 100)
  const searchParams = url.searchParams;
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '50'), 1),
    100
  );

  // Get activity log from service
  const adminActivityService = getAdminActivityService();
  const activities = await adminActivityService.getActivityForEntity(
    'listing',
    listingId,
    limit
  );

  // Transform to frontend-friendly format
  const transformedActivities = activities.map(activity => ({
    id: activity.id,
    action: activity.action_type,
    details: activity.action_description,
    admin_id: activity.admin_user_id,
    ip_address: activity.ip_address || 'N/A',
    created_at: activity.created_at,
    severity: activity.severity,
    before_data: activity.before_data,
    after_data: activity.after_data
  }));

  return createSuccessResponse({
    activities: transformedActivities,
    total: transformedActivities.length,
    listing_id: listingId
  });
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
