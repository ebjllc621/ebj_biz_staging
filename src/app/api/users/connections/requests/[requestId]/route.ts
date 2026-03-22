/**
 * Connection Request Actions API Route
 * PUT /api/users/connections/requests/[requestId] - Accept or decline request
 * DELETE /api/users/connections/requests/[requestId] - Cancel sent request
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
 * PUT /api/users/connections/requests/[requestId]
 * Respond to a connection request (accept or decline)
 *
 * @authenticated Required
 */
export const PUT = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Extract requestId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const requestId = parseInt(lastPart, 10);

  if (isNaN(requestId)) {
    throw BizError.badRequest('Invalid request ID');
  }

  const body = await context.request.json();
  const { action, response_message } = body;

  if (!action || !['accept', 'decline'].includes(action)) {
    throw BizError.badRequest('Action must be "accept" or "decline"');
  }

  // Respond to request
  const result = await service.respondToRequest(requestId, userId, {
    action,
    response_message
  });

  const message = action === 'accept'
    ? 'Connection request accepted'
    : 'Connection request declined';

  return createSuccessResponse({
    result,
    message
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/requests/[requestId]
 * Cancel a sent connection request
 *
 * @authenticated Required
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Extract requestId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || '';
  const requestId = parseInt(lastPart, 10);

  if (isNaN(requestId)) {
    throw BizError.badRequest('Invalid request ID');
  }

  // Cancel request
  await service.cancelConnectionRequest(requestId, userId);

  return createSuccessResponse({
    message: 'Connection request cancelled'
  }, context.requestId);
}, {
  requireAuth: true
});
