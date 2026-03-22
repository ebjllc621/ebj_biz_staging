/**
 * Admin Addons API Routes
 * GET /api/admin/addons - List all addons with pagination
 * POST /api/admin/addons - Create new addon
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: { addons: [], pagination: {} }
 * - Service boundary: SubscriptionService
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
 * GET /api/admin/addons
 * List all addons with optional filtering and pagination
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

  // Parse pagination
  const url = new URL(context.request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const status = url.searchParams.get('status');

  // Get addons
  const db = getDatabaseService();
  const service = new SubscriptionService(db);
  const addons = await service.getAllAddonsAdmin();

  // Filter by status if provided
  const filtered = status
    ? addons.filter(a => a.status === status)
    : addons;

  // Paginate
  const total = filtered.length;
  const startIdx = (page - 1) * limit;
  const paginatedAddons = filtered.slice(startIdx, startIdx + limit);

  return createSuccessResponse({
    addons: paginatedAddons,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, 200);
});

/**
 * POST /api/admin/addons
 * Create new addon
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

  const body = await context.request.json();

  // Validate required fields
  if (!body.suite_name || !body.version || !body.display_name || !body.features) {
    throw BizError.badRequest('Missing required fields: suite_name, version, display_name, features');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  const created = await service.createAddon({
    suite_name: body.suite_name,
    version: body.version,
    display_name: body.display_name,
    description: body.description,
    pricing_monthly: body.pricing_monthly,
    pricing_annual: body.pricing_annual,
    features: body.features,
    effective_date: body.effective_date || new Date().toISOString()
  });

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'addon',
    targetEntityId: created.id,
    actionType: 'addon_created',
    actionCategory: 'creation',
    actionDescription: `Created addon: ${body.display_name}`,
    afterData: { suite_name: body.suite_name, version: body.version, display_name: body.display_name },
    severity: 'normal'
  });

  return createSuccessResponse({ addon: created }, 201);
}));
