/**
 * Admin Package Detail API Routes
 * GET /api/admin/packages/[id] - Get package by ID
 * PUT /api/admin/packages/[id] - Update package
 * DELETE /api/admin/packages/[id] - Archive package
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
 * GET /api/admin/packages/[id]
 * Get single package by ID
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

  // Extract package ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Package ID is required');
  }

  const packageId = parseInt(id);

  if (isNaN(packageId)) {
    throw BizError.badRequest('Invalid package ID');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  // Get all admin plans and find the one with matching ID
  const plans = await service.getAllPlansAdmin();
  const packageData = plans.find(p => p.id === packageId);

  if (!packageData) {
    throw BizError.notFound('Package', packageId);
  }

  return createSuccessResponse({ package: packageData }, 200);
});

/**
 * PUT /api/admin/packages/[id]
 * Update package (requires password verification)
 *
 * Password is collected when user clicks Save in the editor modal.
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

  // Extract package ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Package ID is required');
  }

  const packageId = parseInt(id);

  if (isNaN(packageId)) {
    throw BizError.badRequest('Invalid package ID');
  }

  const body = await context.request.json();

  // Password verification required for updates
  if (!body.password || typeof body.password !== 'string') {
    throw BizError.badRequest('Password verification required for package updates');
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

  const updated = await service.updatePlan(packageId, updateData);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'package',
    targetEntityId: packageId,
    actionType: 'package_updated',
    actionCategory: 'update',
    actionDescription: `Updated package ID: ${packageId}`,
    afterData: updateData,
    severity: 'normal'
  });

  return createSuccessResponse({ package: updated }, 200);
}));

/**
 * DELETE /api/admin/packages/[id]
 * Archive package (requires password verification)
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

  // Extract package ID from URL path
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  if (!id) {
    throw BizError.badRequest('Package ID is required');
  }

  const packageId = parseInt(id);

  if (isNaN(packageId)) {
    throw BizError.badRequest('Invalid package ID');
  }

  const body = await context.request.json();

  // Password verification required for deletion
  if (!body.password || typeof body.password !== 'string') {
    throw BizError.badRequest('Password verification required for package deletion');
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

  await service.archivePlan(packageId);

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'package',
    targetEntityId: packageId,
    actionType: 'package_deleted',
    actionCategory: 'deletion',
    actionDescription: `Archived package ID: ${packageId}`,
    severity: 'normal'
  });

  return createSuccessResponse({
    archived: true,
    id: packageId
  }, 200);
}));
