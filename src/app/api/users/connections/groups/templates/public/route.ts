/**
 * Public Group Templates API Route
 * GET /api/users/connections/groups/templates/public
 *
 * @phase Phase 4B - Group Sharing & Templates
 * @tier STANDARD
 * @generated ComponentBuilder
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionGroupService();

  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const { templates, total } = await service.getPublicTemplates({ limit, offset });

  return createSuccessResponse({ templates, total }, context.requestId);
}, {
  requireAuth: true
});
