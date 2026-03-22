/**
 * GET /api/sharing/recommendations/activity/export
 * Export recommendation activity as CSV within a date range
 *
 * @tier SIMPLE
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import { NextResponse } from 'next/server';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const sharingService = new SharingService(db);
  const userId = parseInt(context.userId!, 10);

  const url = new URL(context.request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const filter = (url.searchParams.get('filter') || 'all') as 'all' | 'sent' | 'received' | 'points';

  if (!startDate || !endDate) {
    throw new BizError({ code: 'VALIDATION_ERROR', message: 'start_date and end_date are required' });
  }

  // Validate date format
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BizError({ code: 'VALIDATION_ERROR', message: 'Invalid date format' });
  }

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Fetch all activity within date range (no pagination limit)
  const activityResult = await sharingService.getActivityLog(userId, {
    page: 1,
    per_page: 10000,
    filter,
    start_date: start,
    end_date: end
  });

  // Build CSV
  const headers = ['Date', 'Type', 'Entity Type', 'Entity', 'Recipient/Sender', 'Message', 'Points', 'Status'];
  const rows = activityResult.items.map(item => {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    const statuses: string[] = [];
    if (item.viewed_at) statuses.push('Viewed');
    if (item.is_helpful === true) statuses.push('Helpful');
    if (item.thanked_at) statuses.push('Thanked');

    return [
      date,
      item.activity_type,
      item.entity_type,
      item.entity_title || '',
      item.other_user_name || '',
      item.message || '',
      String(item.points_earned || 0),
      statuses.join(', ') || '-'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const filename = `recommendation-activity-${startDate}-to-${endDate}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  });
}, { requireAuth: true });
