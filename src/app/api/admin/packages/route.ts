/**
 * Admin Packages API Routes
 * GET /api/admin/packages - List all packages with pagination
 * POST /api/admin/packages - Create new package
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Authentication: Admin-only
 * - Response format: { packages: [], pagination: {} }
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
 * GET /api/admin/packages
 * List all packages with optional filtering and pagination
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

  // Get packages
  const db = getDatabaseService();
  const service = new SubscriptionService(db);
  const packages = await service.getAllPlansAdmin();

  // Filter by status if provided
  const filtered = status
    ? packages.filter(p => p.status === status)
    : packages;

  // Paginate
  const total = filtered.length;
  const startIdx = (page - 1) * limit;
  const paginatedPackages = filtered.slice(startIdx, startIdx + limit);

  return createSuccessResponse({
    packages: paginatedPackages,
    pagination: {
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }, 200);
});

/**
 * POST /api/admin/packages
 * Create new package
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
  if (!body.tier || !body.version || !body.name || !body.features) {
    throw BizError.badRequest('Missing required fields: tier, version, name, features');
  }

  const db = getDatabaseService();
  const service = new SubscriptionService(db);

  const created = await service.createPlan({
    tier: body.tier,
    version: body.version,
    name: body.name,
    pricing_monthly: body.pricing_monthly,
    pricing_annual: body.pricing_annual,
    features: body.features,
    effective_date: body.effective_date ? new Date(body.effective_date) : new Date()
  });

  // Log admin activity
  const adminActivityService = getAdminActivityService();
  await adminActivityService.logActivity({
    adminUserId: user.id,
    targetEntityType: 'package',
    targetEntityId: created.id,
    actionType: 'package_created',
    actionCategory: 'creation',
    actionDescription: `Created package: ${body.name}`,
    afterData: { tier: body.tier, version: body.version, name: body.name },
    severity: 'normal'
  });

  return createSuccessResponse({ package: created }, 201);
}));
