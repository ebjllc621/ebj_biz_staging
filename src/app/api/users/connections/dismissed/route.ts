/**
 * Dismissed Connections API Routes
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan DismissedConnectionsTab
 *
 * GET - Get all dismissed connections (PYMK dismissals + declined requests)
 * DELETE - Permanently remove a dismissed connection from the list
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { DismissedSource } from '@features/connections/types';

/**
 * GET /api/users/connections/dismissed
 *
 * Get all dismissed connections for the authenticated user
 * Combines PYMK dismissals and declined connection requests
 *
 * @returns { dismissed: DismissedConnection[], total: number }
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  const connectionService = getConnectionService();
  const dismissed = await connectionService.getDismissedConnections(userId);

  return createSuccessResponse({
    dismissed,
    total: dismissed.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/dismissed
 *
 * Permanently remove a dismissed connection from the list
 *
 * Body:
 * - dismissed_user_id: number (required) - The user ID to remove from dismissed list
 * - source: 'pymk_dismissed' | 'request_declined' (required) - Source of the dismissal
 *
 * @returns { success: true }
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  // Parse request body with error handling
  let body: { dismissed_user_id?: unknown; source?: unknown };
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON body');
  }

  const { dismissed_user_id, source } = body;

  // Validate required fields
  if (!dismissed_user_id || typeof dismissed_user_id !== 'number') {
    throw BizError.badRequest('dismissed_user_id is required and must be a number');
  }

  const validSources: DismissedSource[] = ['pymk_dismissed', 'request_declined'];
  if (!source || typeof source !== 'string' || !validSources.includes(source as DismissedSource)) {
    throw BizError.badRequest('source must be one of: pymk_dismissed, request_declined');
  }

  const connectionService = getConnectionService();
  await connectionService.permanentlyRemoveDismissed(userId, dismissed_user_id, source as DismissedSource);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true
});
