/**
 * GET /api/listings/[id]/leads/export - Lead CSV Export API
 *
 * @tier API_ROUTE
 * @phase Phase 2B - Lead Capture System
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2B_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use apiHandler wrapper with requireAuth: true
 * - MUST authorize: user owns listing or is admin
 * - Returns raw CSV (NextResponse, not createSuccessResponse)
 * - UTF-8 BOM included for Excel compatibility
 */

import { NextResponse } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
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
    throw BizError.forbidden('You do not have permission to export leads');
  }

  const userId = parseInt(context.userId, 10);

  // Check export eligibility before proceeding
  const leadService = getLeadCaptureService();
  const eligibility = await leadService.checkExportEligibility(listingId, userId);

  if (!eligibility.canExport) {
    throw BizError.forbidden(
      'Your tier does not allow lead exports. Upgrade to Preferred or Premium tier.'
    );
  }

  if (eligibility.remainingExports === 0) {
    throw BizError.forbidden(
      `Monthly export limit reached (${eligibility.monthlyLimit}). Upgrade for more exports.`
    );
  }

  // Parse query params for filters
  const typeParam = url.searchParams.get('type') as LeadInteractionType | null;
  const statusParam = url.searchParams.get('status') as LeadStatus | null;
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');

  // Generate CSV
  const csv = await leadService.exportLeadsCSV({
    listingId,
    userId,
    interactionType: typeParam ?? undefined,
    status: statusParam ?? undefined,
    startDate: startParam ?? undefined,
    endDate: endParam ?? undefined
  });

  // Build filename with today's date
  const today = new Date().toISOString().split('T')[0];
  const filename = `listing-leads-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}, {
  allowedMethods: ['GET'],
  requireAuth: true
});
