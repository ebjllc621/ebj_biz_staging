/**
 * Connection Privacy Settings API Route
 * GET /api/users/settings/connection-privacy - Get privacy settings
 * PUT /api/users/settings/connection-privacy - Update privacy settings
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { ConnectionPrivacySettings } from '@features/connections/types';

export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const settings = await service.getPrivacySettings(userId);

  return createSuccessResponse({ settings }, context.requestId);
}, {
  requireAuth: true
});

export const PUT = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();
  const { whoCanConnect, requireMessage, autoDeclineNoMessage, showConnectionCount, allowFollows } = body;

  // Build partial update
  const updates: Partial<ConnectionPrivacySettings> = {};
  if (whoCanConnect !== undefined) updates.whoCanConnect = whoCanConnect;
  if (requireMessage !== undefined) updates.requireMessage = requireMessage;
  if (autoDeclineNoMessage !== undefined) updates.autoDeclineNoMessage = autoDeclineNoMessage;
  if (showConnectionCount !== undefined) updates.showConnectionCount = showConnectionCount;
  if (allowFollows !== undefined) updates.allowFollows = allowFollows;

  const settings = await service.updatePrivacySettings(userId, updates);

  return createSuccessResponse({
    settings,
    message: 'Privacy settings updated successfully'
  }, context.requestId);
}, {
  requireAuth: true
});
