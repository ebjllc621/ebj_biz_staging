/**
 * Admin Events Export API Route
 * GET /api/admin/events/export - Export events as CSV
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Returns NextResponse with CSV content headers
 * - Service boundary: EventService
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 7 - Admin Enhancements & Cleanup
 */

import { NextResponse } from 'next/server';
import { getEventService } from '@core/services/ServiceRegistry';
import { apiHandler } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

/**
 * GET /api/admin/events/export
 * Export all events as a CSV file
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  const user = await getUserFromRequest(request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('Admin access required');

  const eventService = getEventService();
  const result = await eventService.getAll({}, { page: 1, limit: 10000 });
  const events = result.data;

  // CSV helpers
  const headers = ['id', 'title', 'event_type', 'start_date', 'end_date', 'status', 'is_featured', 'capacity', 'listing_id', 'venue_name', 'city', 'state'];
  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = events.map(e => [
    e.id,
    e.title,
    e.event_type,
    e.start_date instanceof Date ? e.start_date.toISOString() : e.start_date,
    e.end_date instanceof Date ? e.end_date.toISOString() : e.end_date,
    e.status,
    e.is_featured ? 'Yes' : 'No',
    e.total_capacity,
    e.listing_id,
    e.venue_name,
    e.city,
    e.state,
  ].map(escapeCSV).join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `events-export-${timestamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});
