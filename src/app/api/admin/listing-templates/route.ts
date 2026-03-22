/**
 * GET /api/admin/listing-templates  — Paginated + filtered template list (admin only)
 * POST /api/admin/listing-templates — Create new template (admin only)
 *
 * @authority Phase 4C Brain Plan - 4.10 ListingTemplateAdmin
 * @tier STANDARD
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getListingTemplateService } from '@core/services/ListingTemplateService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access listing templates admin', 'admin');

  const { searchParams } = new URL(context.request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const industry = searchParams.get('industry') || undefined;
  const isSystemParam = searchParams.get('is_system');
  const is_system =
    isSystemParam === 'true' ? true : isSystemParam === 'false' ? false : undefined;
  const isActiveParam = searchParams.get('is_active');
  const is_active =
    isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

  const service = getListingTemplateService();
  const result = await service.getAll({ industry, is_system, is_active }, { page, pageSize });

  return createSuccessResponse({
    templates: result.items,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    },
  });
}, { requireAuth: true });

export const POST = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('create listing template', 'admin');

  const body = await context.request.json();
  const service = getListingTemplateService();
  const template = await service.create({
    ...body,
    created_by_user_id: user.id ? parseInt(String(user.id), 10) : null,
    is_system: body.is_system ?? true,
  });

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: 'listing_template',
    targetEntityId: (template as { id?: number })?.id ?? null,
    actionType: 'listing_template_created',
    actionCategory: 'creation',
    actionDescription: `Created listing template: ${body.name || 'unnamed'}`,
    afterData: { name: body.name, industry: body.industry, is_system: body.is_system ?? true },
    severity: 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ template });
}, { requireAuth: true });
