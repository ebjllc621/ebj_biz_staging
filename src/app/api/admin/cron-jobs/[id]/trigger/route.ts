/**
 * Admin Cron Job Trigger API Route
 * POST /api/admin/cron-jobs/[id]/trigger - Manually trigger a cron job
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
import { jsonMethodNotAllowed } from '@/lib/http/json';

function getIdFromUrl(requestUrl: string): number {
  const url = new URL(requestUrl);
  const pathParts = url.pathname.split('/');
  // URL: /api/admin/cron-jobs/[id]/trigger => id is at length - 2
  const id = parseInt(pathParts[pathParts.length - 2] ?? '', 10);
  if (isNaN(id)) throw BizError.badRequest('Invalid cron job ID');
  return id;
}

async function handleTrigger(context: ApiContext) {
  const id = getIdFromUrl(context.request.url);
  const cronService = getCronJobService();

  const job = await cronService.getJobById(id);
  if (!job) throw BizError.notFound('cron_job', id);

  const run = await cronService.triggerJob(id, parseInt(context.userId!));

  getAdminActivityService().logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'cron_job',
    targetEntityId: id,
    actionType: 'cron_job_triggered',
    actionCategory: 'configuration',
    actionDescription: `Manually triggered cron job #${id} (${job.name})`,
    afterData: { jobId: id, jobName: job.name, runId: (run as { id?: number })?.id },
    severity: 'high',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ run });
}

export const POST = withCsrf(apiHandler(handleTrigger, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: { action: 'write', resource: 'settings' }
}));

const ALLOWED_METHODS = ['POST'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function DELETE() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}
