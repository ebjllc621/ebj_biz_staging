/**
 * Connection Management API Route
 * DELETE /api/users/connections/[connectionId] - Remove a connection
 * PUT /api/users/connections/[connectionId] - Update connection (notes, tags)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/[username]/profile/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

/**
 * DELETE /api/users/connections/[connectionId]
 * Remove an existing connection
 *
 * @authenticated Required
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Extract connectionId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const connectionId = parseInt(lastPart, 10);

  if (isNaN(connectionId)) {
    throw BizError.badRequest('Invalid connection ID');
  }

  // Remove connection
  await service.removeConnection(connectionId, userId);

  return createSuccessResponse({
    message: 'Connection removed successfully'
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * PUT /api/users/connections/[connectionId]
 * Update connection (notes, tags, type)
 *
 * @authenticated Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Extract connectionId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const connectionId = parseInt(lastPart, 10);

  if (isNaN(connectionId)) {
    throw BizError.badRequest('Invalid connection ID');
  }

  const body = await context.request.json();
  const { notes, tags, connection_type } = body;

  // Update connection
  await service.updateConnection(connectionId, userId, {
    notes,
    tags,
    connection_type
  });

  return createSuccessResponse({
    message: 'Connection updated successfully'
  }, context.requestId);
}, {
  requireAuth: true
});
