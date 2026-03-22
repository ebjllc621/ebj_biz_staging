/**
 * Admin Cron Job Runs API Route
 * GET /api/admin/cron-jobs/[id]/runs - Get execution history for a job
 *
 * @authority CLAUDE.md - Admin API standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getCronJobService } from '@core/services/CronJobService';
import { BizError } from '@core/errors/BizError';

function getIdFromUrl(requestUrl: string): number {
  const url = new URL(requestUrl);
  const pathParts = url.pathname.split('/');
  // URL: /api/admin/cron-jobs/[id]/runs => id is at length - 2
  const id = parseInt(pathParts[pathParts.length - 2] ?? '', 10);
  if (isNaN(id)) throw BizError.badRequest('Invalid cron job ID');
  return id;
}

async function handleGet(context: ApiContext) {
  const id = getIdFromUrl(context.request.url);
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const cronService = getCronJobService();
  const job = await cronService.getJobById(id);
  if (!job) throw BizError.notFound('cron_job', id);

  const runs = await cronService.getJobRuns(id, Math.min(limit, 100));

  return createSuccessResponse({ items: runs });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: { action: 'read', resource: 'settings' }
});
