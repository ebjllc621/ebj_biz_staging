/**
 * Batch Connection Requests API Route
 * POST /api/users/connections/requests/batch - Batch accept/decline requests
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/contacts/bulk/route.ts - Batch operation pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { getConnectionService } from '@core/services/ServiceRegistry';

/**
 * POST /api/users/connections/requests/batch
 * Batch respond to multiple connection requests
 *
 * Body:
 * - action (required): 'accept' | 'decline'
 * - request_ids (required): Array of request IDs
 * - response_message (optional): Optional response message for all
 *
 * Returns:
 * - total: Total number of requests processed
 * - successful: Number of successful operations
 * - failed: Number of failed operations
 * - errors: Array of error details for failed operations
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const service = getConnectionService();
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate action
  if (!body.action || !['accept', 'decline'].includes(body.action)) {
    return createErrorResponse(
      new BizError({
        code: 'INVALID_ACTION',
        message: 'Action must be "accept" or "decline"'
      }),
      context.requestId
    );
  }

  // Validate request_ids
  if (!body.request_ids || !Array.isArray(body.request_ids) || body.request_ids.length === 0) {
    return createErrorResponse(
      new BizError({
        code: 'MISSING_REQUEST_IDS',
        message: 'request_ids must be a non-empty array'
      }),
      context.requestId
    );
  }

  // Execute batch operation
  const result = await service.batchRespondToRequests(
    userId,
    body.request_ids,
    body.action,
    body.response_message
  );

  return createSuccessResponse({
    result,
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    errors: result.errors
  }, context.requestId);
}, {
  requireAuth: true
});
