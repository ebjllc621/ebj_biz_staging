/**
 * Admin Cron Jobs API Routes
 * GET /api/admin/cron-jobs - List all cron jobs with stats
 * POST /api/admin/cron-jobs - Create a new cron job
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

async function handleGet(context: ApiContext) {
  const cronService = getCronJobService();
  const [jobs, stats] = await Promise.all([
    cronService.getAllJobs(),
    cronService.getStats()
  ]);

  return createSuccessResponse({ items: jobs, stats });
}

async function handlePost(context: ApiContext) {
  const body = await context.request.json();
  const { name, slug, endpoint, schedule } = body;

  if (!name || !slug || !endpoint || !schedule) {
    throw BizError.badRequest('name, slug, endpoint, and schedule are required');
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw BizError.badRequest('slug must contain only lowercase letters, numbers, and hyphens');
  }

  const cronParts = schedule.trim().split(/\s+/);
  if (cronParts.length < 5 || cronParts.length > 6) {
    throw BizError.badRequest('schedule must be a valid cron expression (5 or 6 fields)');
  }

  const cronService = getCronJobService();
  const job = await cronService.createJob(body, parseInt(context.userId!));

  getAdminActivityService().logActivity({
    adminUserId: parseInt(context.userId!),
    targetEntityType: 'cron_job',
    targetEntityId: (job as { id?: number })?.id ?? null,
    actionType: 'cron_job_created',
    actionCategory: 'configuration',
    actionDescription: `Created cron job: ${name} (${slug}) — ${schedule}`,
    afterData: { name, slug, endpoint, schedule },
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

export const POST = withCsrf(apiHandler(handlePost, {
  allowedMethods: ['POST'],
  requireAuth: true,
  rbac: { action: 'create', resource: 'settings' }
}));
