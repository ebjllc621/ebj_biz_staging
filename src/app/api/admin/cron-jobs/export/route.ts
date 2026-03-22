/**
 * Admin Cron Jobs Export API Route
 * GET /api/admin/cron-jobs/export?format=crontab|vercel - Export cron configuration
 *
 * @authority CLAUDE.md - Admin API standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getCronJobService } from '@core/services/CronJobService';
import { NextResponse } from 'next/server';

async function handleGet(context: ApiContext) {
  const url = new URL(context.request.url);
  const format = url.searchParams.get('format') || 'crontab';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const cronService = getCronJobService();

  if (format === 'vercel') {
    const config = await cronService.exportVercelConfig();
    return createSuccessResponse({ config });
  }

  // Default: crontab
  const crontab = await cronService.exportCrontab(baseUrl);
  return new NextResponse(crontab, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="crontab"'
    }
  });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: { action: 'read', resource: 'settings' }
});
