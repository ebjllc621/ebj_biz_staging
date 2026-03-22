/**
 * Admin Package Display Toggle API Route
 * PATCH /api/admin/packages/[id]/display - Toggle package display status (shown/hidden)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - CSRF protection: PATCH operation
 * - Immediate effect: No password verification required for display toggle
 *
 * @authority docs/packages/phases/PHASE_5.0_BRAIN_PLAN.md
 * @phase Phase 5.2 - API Routes
 */

import { NextRequest } from 'next/server';
import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SubscriptionService } from '@core/services/SubscriptionService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/**
 * PATCH /api/admin/packages/[id]/display
 * Toggle package display status (shown/hidden) immediately
 */
export const PATCH = withCsrf(apiHandler(async (context) => {
  // Authentication
  const user = await getUserFromRequest(context.request as NextRequest);
  if (!user) {
    throw BizError.unauthorized('Authentication required');
  }
  if (user.role !== 'admin') {
    throw BizError.forbidden('Admin access required');
  }

  // Extract package ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Path is /api/admin/packages/[id]/display, so [id] is 3rd from end
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    throw BizError.badRequest('Package ID is required');
  }

  const packageId = parseInt(id);

  if (isNaN(packageId)) {
    throw BizError.badRequest('Invalid package ID');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  const updated = await service.togglePlanDisplay(packageId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'package',
    targetEntityId: packageId,
    actionType: 'package_display_updated',
    actionCategory: 'update',
    actionDescription: `Toggled display for package ID: ${packageId}`,
    afterData: { is_displayed: updated?.is_displayed },
    severity: 'normal'
  });

  return createSuccessResponse({ package: updated }, 200);
}));
