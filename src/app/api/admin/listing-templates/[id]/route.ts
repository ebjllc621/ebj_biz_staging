/**
 * PATCH /api/admin/listing-templates/[id]  — Update template (admin only)
 * DELETE /api/admin/listing-templates/[id] — Delete template (admin only)
 *
 * @authority Phase 4C Brain Plan - 4.10 ListingTemplateAdmin
 * @tier SIMPLE
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getListingTemplateService } from '@core/services/ListingTemplateService';
import { getAdminActivityService } from '@core/services/AdminActivityService';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';

function getIdFromUrl(url: string): number {
  const parts = new URL(url).pathname.split('/');
  return parseInt(parts[parts.length - 1] ?? '', 10);
}

export const PATCH = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('update listing template', 'admin');

  const id = getIdFromUrl(context.request.url);
  if (isNaN(id)) throw new BizError({ code: 'VALIDATION_ERROR', message: 'Invalid template ID' });

  const body = await context.request.json();
  const service = getListingTemplateService();
  const template = await service.update(id, body);

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: 'listing_template',
    targetEntityId: id,
    actionType: 'listing_template_updated',
    actionCategory: 'update',
    actionDescription: `Updated listing template #${id}`,
    afterData: body as Record<string, unknown>,
    severity: 'normal',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ template });
}, { requireAuth: true });

export const DELETE = apiHandler(async (context) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('delete listing template', 'admin');

  const id = getIdFromUrl(context.request.url);
  if (isNaN(id)) throw new BizError({ code: 'VALIDATION_ERROR', message: 'Invalid template ID' });

  const service = getListingTemplateService();
  await service.delete(id);

  getAdminActivityService().logActivity({
    adminUserId: user.id,
    targetEntityType: 'listing_template',
    targetEntityId: id,
    actionType: 'listing_template_deleted',
    actionCategory: 'deletion',
    actionDescription: `Deleted listing template #${id}`,
    severity: 'high',
    ipAddress: context.request.headers.get('x-forwarded-for') || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
    sessionId: context.request.cookies.get('bk_session')?.value,
  }).catch(() => {});

  return createSuccessResponse({ deleted: true });
}, { requireAuth: true });
