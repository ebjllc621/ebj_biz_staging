/**
 * Admin Menu Item API Routes
 * GET /api/admin/menus/[id] - Get menu by ID
 * PATCH /api/admin/menus/[id] - Update menu
 * DELETE /api/admin/menus/[id] - Delete menu
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 4.4
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { MenuService } from '@core/services/MenuService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { BizError } from '@core/errors/BizError';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const menuService = new MenuService();
    const item = await menuService.getMenuById(id);

    return createSuccessResponse({ item }, 200);
  })(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const body = await context.request.json();

    const menuService = new MenuService();
    const item = await menuService.updateMenu(id, body);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'menu',
      targetEntityId: id,
      actionType: 'menu_updated',
      actionCategory: 'update',
      actionDescription: `Updated menu item #${id}`,
      afterData: body as Record<string, unknown>,
      severity: 'normal',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ item }, 200);
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(async (context: ApiContext) => {
    // TODO: Admin auth

    const id = parseInt(params.id);
    const menuService = new MenuService();
    await menuService.deleteMenu(id);

    getAdminActivityService().logActivity({
      adminUserId: parseInt(context.userId!),
      targetEntityType: 'menu',
      targetEntityId: id,
      actionType: 'menu_deleted',
      actionCategory: 'deletion',
      actionDescription: `Deleted menu item #${id}`,
      severity: 'high',
      ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
      userAgent: context.request.headers.get('user-agent') || undefined,
      sessionId: context.request.cookies.get('bk_session')?.value,
    }).catch(() => {});

    return createSuccessResponse({ success: true }, 200);
  })(request);
}
