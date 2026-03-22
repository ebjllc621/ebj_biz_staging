/**
 * Admin Addon Detail API Routes
 * GET /api/admin/addons/[id] - Get addon by ID
 * PUT /api/admin/addons/[id] - Update addon
 * DELETE /api/admin/addons/[id] - Archive addon
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - CSRF protection: PUT and DELETE operations
 * - Password verification: Required for PUT and DELETE
 *
 * @authority PHASE_1_BRAIN_PLAN.md
 * @phase Phase 1 - Admin API Routes
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
 * GET /api/admin/addons/[id]
 * Get single addon by ID
 */
export const GET = apiHandler(async (context) => {
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
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Addon ID is required');
  }

  const addonId = parseInt(id);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addon ID');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  // Get all admin addons and find the one with matching ID
  const addons = await service.getAllAddonsAdmin();
  const addonData = addons.find(a => a.id === addonId);

  if (!addonData) {
    throw BizError.notFound('Addon', addonId);
  }

  return createSuccessResponse({ addon: addonData }, 200);
});

/**
 * PUT /api/admin/addons/[id]
 * Update addon (requires password verification)
 */
export const PUT = withCsrf(apiHandler(async (context) => {
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
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Addon ID is required');
  }

  const addonId = parseInt(id);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addon ID');
  }

  const body = await context.request.json();

  // Password verification required for updates
  if (!body.password || typeof body.password !== 'string') {
    throw BizError.badRequest('Password verification required for addon updates');
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
      body: JSON.stringify({ password: body.password })
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

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  // Remove password from update data
  const { password: _, ...updateData } = body;

  const updated = await service.updateAddon(addonId, updateData);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'addon',
    targetEntityId: addonId,
    actionType: 'addon_updated',
    actionCategory: 'update',
    actionDescription: `Updated addon ID: ${addonId}`,
    afterData: updateData,
    severity: 'normal'
  });

  return createSuccessResponse({ addon: updated }, 200);
}));

/**
 * DELETE /api/admin/addons/[id]
 * Archive addon (requires password verification)
 */
export const DELETE = withCsrf(apiHandler(async (context) => {
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
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Addon ID is required');
  }

  const addonId = parseInt(id);

  if (isNaN(addonId)) {
    throw BizError.badRequest('Invalid addon ID');
  }

  const body = await context.request.json();

  // Password verification required for deletion
  if (!body.password || typeof body.password !== 'string') {
    throw BizError.badRequest('Password verification required for addon deletion');
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
      body: JSON.stringify({ password: body.password })
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

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  await service.archiveAddon(addonId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'addon',
    targetEntityId: addonId,
    actionType: 'addon_deleted',
    actionCategory: 'deletion',
    actionDescription: `Archived addon ID: ${addonId}`,
    severity: 'normal'
  });

  return createSuccessResponse({
    archived: true,
    id: addonId
  }, 200);
}));
