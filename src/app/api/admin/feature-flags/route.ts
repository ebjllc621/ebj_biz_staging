/**
 * Admin Feature Flags API Routes
 * GET /api/admin/feature-flags - Get all feature flags
 * POST /api/admin/feature-flags - Create new feature flag
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 4.2
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { FeatureFlagService } from '@core/services/FeatureFlagService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

async function handleGet(context: ApiContext) {
const db = getDatabaseService();
    const service = new FeatureFlagService(db);

    const flags = await service.getAllFlags();

    return createSuccessResponse({ flags });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true
,
  rbac: {
    action: 'read',
    resource: 'feature_flags'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

async function handlePost(context: ApiContext) {
// TODO: Admin auth

    const body = await context.request.json();
    const { flag_key, name, description, is_enabled, rollout_percentage, target_tiers, target_user_ids, environment } = body;

    if (!flag_key || !name) {
      throw BizError.badRequest('flag_key and name are required');
    }

    const db = getDatabaseService();
    const service = new FeatureFlagService(db);

    const flag = await service.createFlag({
      flag_key,
      name,
      description,
      is_enabled,
      rollout_percentage,
      target_tiers,
      target_user_ids,
      environment
    });

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'feature_flag',
      targetEntityId: flag.id ?? 0,
      actionType: 'feature_flag_created',
      actionCategory: 'configuration',
      actionDescription: `Created feature flag: ${flag_key}`,
      afterData: { flag_key, name, description, is_enabled, rollout_percentage, target_tiers, target_user_ids, environment },
      severity: 'high',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return createSuccessResponse({ flag }, 201);
}

// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(handlePost, {
  allowedMethods: ['POST'],
  requireAuth: true
,
  rbac: {
    action: 'create',
    resource: 'feature_flags'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
}));
