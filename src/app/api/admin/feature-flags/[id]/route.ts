/**
 * Admin Feature Flag Management API Routes
 * PUT /api/admin/feature-flags/[id] - Update feature flag
 * DELETE /api/admin/feature-flags/[id] - Delete feature flag
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 4.2
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { FeatureFlagService } from '@core/services/FeatureFlagService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    if (isNaN(id)) {
      throw BizError.badRequest('Invalid flag ID');
    }

    const body = await context.request.json();
    const { name, description, is_enabled, rollout_percentage, target_tiers, target_user_ids, environment } = body;

    const db = getDatabaseService();
    const service = new FeatureFlagService(db);

    const existingFlag = await service.getFlagById(id);

    const flag = await service.updateFlag(id, {
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
      targetEntityId: id,
      actionType: 'feature_flag_updated',
      actionCategory: 'configuration',
      actionDescription: `Updated feature flag: ${existingFlag?.flag_key ?? id}`,
      beforeData: existingFlag ? (existingFlag as unknown as Record<string, unknown>) : undefined,
      afterData: { name, description, is_enabled, rollout_percentage, target_tiers, target_user_ids, environment },
      severity: 'high',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return createSuccessResponse({ flag }, 200);
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    if (isNaN(id)) {
      throw BizError.badRequest('Invalid flag ID');
    }

    const db = getDatabaseService();
    const service = new FeatureFlagService(db);

    const existingFlag = await service.getFlagById(id);

    await service.deleteFlag(id);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'feature_flag',
      targetEntityId: id,
      actionType: 'feature_flag_deleted',
      actionCategory: 'configuration',
      actionDescription: `Deleted feature flag: ${existingFlag?.flag_key ?? id}`,
      beforeData: existingFlag ? (existingFlag as unknown as Record<string, unknown>) : undefined,
      severity: 'high',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value
    }).catch(() => {});

    return createSuccessResponse({ success: true }, 200);
  })(request);
}
