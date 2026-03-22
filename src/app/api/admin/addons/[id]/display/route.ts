/**
 * Admin Addon Display Toggle API Route
 * PATCH /api/admin/addons/[id]/display - Toggle addon display status (shown/hidden)
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
 * PATCH /api/admin/addons/[id]/display
 * Toggle addon display status (shown/hidden) immediately
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

  // Extract addon ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  // Path is /api/admin/addons/[id]/display, so [id] is 3rd from end
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    throw BizError.badRequest('Addon ID is required');
  }

  const addonId = parseInt(id);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addon ID');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  const updated = await service.toggleAddonDisplay(addonId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'addon',
    targetEntityId: addonId,
    actionType: 'addon_display_updated',
    actionCategory: 'update',
    actionDescription: `Toggled display for addon ID: ${addonId}`,
    afterData: { is_displayed: updated?.is_displayed },
    severity: 'normal'
  });

  return createSuccessResponse({ addon: updated }, 200);
}));
