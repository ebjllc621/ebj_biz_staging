/**
 * GET /api/listings/[id]/leads - Listing Lead Capture API
 *
 * @tier API_ROUTE
 * @phase Phase 2B - Lead Capture System
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2B_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper with requireAuth: true
 * - MUST use bigIntToNumber for COUNT(*) results (delegated to service)
 * - MUST authorize: user owns listing or is admin
 * - Returns flat response: leads, summary, pagination, export_eligibility
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getLeadCaptureService } from '@core/services/LeadCaptureService';
import { BizError } from '@core/errors/BizError';
import type { LeadInteractionType, LeadStatus } from '@core/services/LeadCaptureService';

export const GET = apiHandler(async (context: ApiContext) => {
  if (!context.userId) {
    throw BizError.unauthorized('Authentication required');
  }

  const db = getDatabaseService();

  // Extract listing ID from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const listingIdStr = pathParts[pathParts.indexOf('listings') + 1];

  if (!listingIdStr) {
    throw BizError.badRequest('Listing ID is required');
  }

  const listingId = parseInt(listingIdStr, 10);
  if (isNaN(listingId)) {
    throw BizError.badRequest('Invalid listing ID');
  }

  // Verify ownership (listing owner OR admin)
  const ownershipResult = await db.query<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId]
  );

  if (ownershipResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const isOwner = ownershipResult.rows[0]?.user_id === parseInt(context.userId, 10);

  const userResult = await db.query<{ role: string }>(
    'SELECT role FROM users WHERE id = ?',
    [parseInt(context.userId, 10)]
  );
  const isAdmin = userResult.rows[0]?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw BizError.forbidden('You do not have permission to view leads');
  }

  // Parse query params
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  const typeParam = url.searchParams.get('type') as LeadInteractionType | null;
  const statusParam = url.searchParams.get('status') as LeadStatus | null;
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  const leadService = getLeadCaptureService();

  // Fetch leads + summary + eligibility in parallel
  const [leadsResult, summary, exportEligibility] = await Promise.all([
    leadService.getLeads({
      listingId,
      page,
      limit,
      interactionType: typeParam ?? undefined,
      status: statusParam ?? undefined,
      startDate: startParam ?? undefined,
      endDate: endParam ?? undefined
    }),
    leadService.getLeadSummary(listingId, {
      startDate: startParam ?? undefined,
      endDate: endParam ?? undefined
    }),
    leadService.checkExportEligibility(listingId, parseInt(context.userId, 10))
  ]);

  return createSuccessResponse(
    {
      leads: leadsResult.leads,
      summary,
      pagination: leadsResult.pagination,
      export_eligibility: exportEligibility
    },
    context.requestId
  );
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
