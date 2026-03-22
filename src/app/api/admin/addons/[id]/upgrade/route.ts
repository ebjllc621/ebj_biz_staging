/**
 * Admin Addon Upgrade API Route
 * POST /api/admin/addons/[id]/upgrade - Create new upgraded version
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - CSRF protection: POST operation
 * - Password verification: REQUIRED for addon upgrade
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
import type { UpgradeAddonInput } from '@/types/admin-packages';
import { getAdminActivityService } from '@core/services/AdminActivityService';

/**
 * POST /api/admin/addons/[id]/upgrade
 * Create new upgraded addon version (requires password)
 */
export const POST = withCsrf(apiHandler(async (context) => {
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
  // Path is /api/admin/addons/[id]/upgrade, so [id] is 3rd from end
  const id = pathParts[pathParts.length - 2];

  if (!id) {
    throw BizError.badRequest('Addon ID is required');
  }

  const addonId = parseInt(id);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addon ID');
  }

  // Parse request body
  const body = await context.request.json();
  const { password, pricing_monthly, pricing_annual, features, effective_date } = body;

  // Password verification required
  if (!password || typeof password !== 'string') {
    throw BizError.badRequest('Password is required for addon upgrade');
  }

  // Verify password via verify-password endpoint
  const verifyResponse = await fetch(
    new URL('/api/admin/verify-password', url.origin).toString(),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': context.request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ password })
    }
  );

  if (!verifyResponse.ok) {
    const errorData = await verifyResponse.json();
    throw new BizError({
      code: 'PASSWORD_VERIFICATION_FAILED',
      message: errorData.error?.message || 'Password verification failed',
      context: errorData.error?.details
    });
  }

  // Build upgrade input
  const upgradeInput: UpgradeAddonInput = {
    pricing_monthly,
    pricing_annual,
    features,
    effective_date
  };

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  const result = await service.createUpgradedAddonVersion(addonId, upgradeInput);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'addon',
    targetEntityId: addonId,
    actionType: 'addon_upgrade_processed',
    actionCategory: 'update',
    actionDescription: `Upgraded addon ID: ${addonId}`,
    afterData: { pricing_monthly, pricing_annual, effective_date },
    severity: 'normal'
  });

  return createSuccessResponse({
    newAddon: result.newAddon,
    previousAddon: result.previousAddon
  }, 201);
}));
