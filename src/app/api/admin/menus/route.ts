/**
 * Admin Menus API Routes
 * GET /api/admin/menus - Get menu items by location
 * POST /api/admin/menus - Create menu
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.4
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { MenuService } from '@core/services/MenuService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

async function handleGet(context: ApiContext) {
const { request } = context;

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') as 'header' | 'footer' | 'sidebar' | null;

    const menuService = new MenuService();
    const items = await menuService.getMenusByLocation(location || 'header');

    return createSuccessResponse({ items });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true
,
  rbac: {
    action: 'read',
    resource: 'menus'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
});

async function handlePost(context: ApiContext) {
// TODO: Admin auth

    const body = await context.request.json();

    const menuService = new MenuService();
    const item = await menuService.createMenu(body);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'menu',
      targetEntityId: (item as { id?: number })?.id ?? null,
      actionType: 'menu_created',
      actionCategory: 'creation',
      actionDescription: `Created menu item`,
      afterData: body as Record<string, unknown>,
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ item });
}

// GOVERNANCE: CSRF protection for state-changing operations
export const POST = withCsrf(apiHandler(handlePost, {
  allowedMethods: ['POST'],
  requireAuth: true
,
  rbac: {
    action: 'create',
    resource: 'menus'
  },
  rateLimit: {
    requests: 100,
    windowMs: 60000
  }
}));
