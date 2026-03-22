/**
 * Connection Requests API Route
 * GET /api/users/connections/requests - Get pending connection requests (sent & received)
 * POST /api/users/connections/requests - Send new connection request
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
 * GET /api/users/connections/requests
 * Get pending connection requests for the authenticated user
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  // Get both received and sent requests
  const pending_received = await service.getPendingRequestsForUser(userId);
  const pending_sent = await service.getSentRequestsForUser(userId);

  return createSuccessResponse({
    pending_received,
    pending_sent,
    total_received: pending_received.length,
    total_sent: pending_sent.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/requests
 * Send a new connection request
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();

  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();
  const { receiver_user_id, message, connection_type, intent_type } = body;

  if (!receiver_user_id) {
    throw BizError.badRequest('receiver_user_id is required');
  }

  if (!intent_type) {
    throw BizError.badRequest('intent_type is required');
  }

  // Send connection request
  const request = await service.sendConnectionRequest({
    sender_user_id: userId,
    receiver_user_id: parseInt(receiver_user_id, 10),
    message,
    connection_type,
    intent_type
  });

  return createSuccessResponse({
    request,
    message: 'Connection request sent successfully'
  }, context.requestId);
}, {
  requireAuth: true
});
