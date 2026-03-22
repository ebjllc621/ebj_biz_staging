/**
 * Admin Event Sponsor Management API Route
 *
 * PATCH /api/admin/events/sponsors/[id] - Admin status management (admin only)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Admin authentication required
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 5 - Task 5.6: Admin Sponsor Routes
 */

import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import type { EventSponsorStatus, EventSponsorTier } from '@features/events/types';

/**
 * PATCH /api/admin/events/sponsors/[id]
 * Admin only — update sponsor tier, status, or other fields
 */
export const PATCH = apiHandler(async (context) => {
  const { request } = context;

  const url = new URL(request.url);
  const parts = url.pathname.split('/');
  const id = parseInt(parts[parts.length - 1] ?? '');
  if (isNaN(id)) {
    return createErrorResponse('Invalid sponsor ID', 400);
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }
  if (user.role !== 'admin') {
    return createErrorResponse('Admin privileges required', 403);
  }

  let body: {
    sponsor_tier?: unknown;
    display_order?: unknown;
    sponsor_logo?: unknown;
    sponsor_message?: unknown;
    status?: unknown;
    start_date?: unknown;
    end_date?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return createErrorResponse('Invalid request body', 400);
  }

  const validTiers: EventSponsorTier[] = ['title', 'gold', 'silver', 'bronze', 'community'];
  const validStatuses: EventSponsorStatus[] = ['pending', 'active', 'expired', 'cancelled'];

  if (body.sponsor_tier !== undefined && !validTiers.includes(body.sponsor_tier as EventSponsorTier)) {
    return createErrorResponse('Invalid sponsor_tier value', 400);
  }
  if (body.status !== undefined && !validStatuses.includes(body.status as EventSponsorStatus)) {
    return createErrorResponse('Invalid status value', 400);
  }

  const eventService = getEventService();

  try {
    const updated = await eventService.updateEventSponsor(id, {
      sponsor_tier: body.sponsor_tier as EventSponsorTier | undefined,
      display_order: body.display_order !== undefined ? Number(body.display_order) : undefined,
      sponsor_logo: typeof body.sponsor_logo === 'string' ? body.sponsor_logo : undefined,
      sponsor_message: typeof body.sponsor_message === 'string' ? body.sponsor_message.trim() : undefined,
      status: body.status as EventSponsorStatus | undefined,
      start_date: typeof body.start_date === 'string' ? body.start_date : undefined,
      end_date: typeof body.end_date === 'string' ? body.end_date : undefined,
    });

    const adminActivityService = getAdminActivityService();
    await adminActivityService.logActivity({
      adminUserId: user.id,
      targetEntityType: 'event_sponsor',
      targetEntityId: id,
      actionType: 'event_sponsor_updated',
      actionCategory: 'update',
      actionDescription: `Updated event sponsor ID ${id}`,
      afterData: { sponsor_tier: body.sponsor_tier, status: body.status, display_order: body.display_order },
      severity: 'normal'
    });

    return createSuccessResponse({ sponsor: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Sponsor not found') {
      return createErrorResponse('Sponsor not found', 404);
    }
    throw error;
  }
});
