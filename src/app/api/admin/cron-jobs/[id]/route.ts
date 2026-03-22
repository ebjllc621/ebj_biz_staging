/**
 * Admin Cron Job Detail API Routes
 * GET /api/admin/cron-jobs/[id] - Get single cron job
 * PUT /api/admin/cron-jobs/[id] - Update a cron job
 *
 * @authority CLAUDE.md - Admin API standards
 * @tier STANDARD
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getCronJobService } from '@core/services/CronJobService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

function getIdFromUrl(requestUrl: string): number {
  const url = new URL(requestUrl);
  const pathParts = url.pathname.split('/');
  const id = parseInt(pathParts[pathParts.length - 1] ?? '', 10);
  if (isNaN(id)) throw BizError.badRequest('Invalid cron job ID');
  return id;
}

async function handleGet(context: ApiContext) {
  const id = getIdFromUrl(context.request.url);
  const cronService = getCronJobService();
  const job = await cronService.getJobById(id);

  if (!job) throw BizError.notFound('cron_job', id);

  const runs = await cronService.getJobRuns(id, 20);
  return createSuccessResponse({ job, runs });
}

async function handlePut(context: ApiContext) {
  const id = getIdFromUrl(context.request.url);
  const body = await context.request.json();

  if (body.schedule) {
    const cronParts = body.schedule.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      throw BizError.badRequest('schedule must be a valid cron expression (5 or 6 fields)');
    }
  }

  const cronService = getCronJobService();
  const job = await cronService.updateJob(id, body, parseInt(context.userId!));

  if (!job) throw BizError.notFound('cron_job', id);

  getAdminActivityService().logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'cron_job',
    targetEntityId: id,
    actionType: 'cron_job_updated',
    actionCategory: 'configuration',
    actionDescription: `Updated cron job #${id}`,
    afterData: body as Record<string, unknown>,
    severity: 'critical',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ job });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true,
  rbac: { action: 'read', resource: 'settings' }
});

export const PUT = withCsrf(apiHandler(handlePut, {
  allowedMethods: ['PUT'],
  requireAuth: true,
  rbac: { action: 'update', resource: 'settings' }
}));
