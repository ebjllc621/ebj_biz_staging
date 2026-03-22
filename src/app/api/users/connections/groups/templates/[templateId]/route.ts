/**
 * Group Template Delete API Route
 * DELETE /api/users/connections/groups/templates/[templateId]
 *
 * @phase Phase 4B - Group Sharing & Templates
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

function extractTemplateId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const templatesIndex = pathParts.indexOf('templates');
  const templateIdStr = pathParts[templatesIndex + 1] || '';
  const templateId = parseInt(templateIdStr, 10);
  if (isNaN(templateId)) {
    throw BizError.badRequest('Invalid template ID');
  }
  return templateId;
}

export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();
  const userId = parseInt(context.userId!, 10);
  const templateId = extractTemplateId(context);

  await service.deleteTemplate(templateId, userId);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true
}));
