/**
 * Blocked Users (Blacklist) API Routes
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/dna/brain-plans/BLACKLIST_TAB_BRAIN_PLAN.md
 *
 * GET - Get all blocked users for the authenticated user
 * POST - Block a user with granular area controls
 * DELETE - Unblock a user completely
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getConnectionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import { BlockUserInput } from '@features/connections/types';

/**
 * GET /api/users/connections/blocked
 *
 * Get all users blocked by the authenticated user (blacklist)
 *
 * @returns { blocked: BlockedUser[], total: number }
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  const connectionService = getConnectionService();
  const blocked = await connectionService.getBlockedUsers(userId);

  return createSuccessResponse({
    blocked,
    total: blocked.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/blocked
 *
 * Block a user with granular area controls
 *
 * Body:
 * - blocked_user_id: number (required) - The user ID to block
 * - block_messages: boolean (required) - Block in Messages
 * - block_connections: boolean (required) - Block in Connections
 * - block_pymk: boolean (required) - Block in People You May Know
 * - block_reason: string (optional) - Reason for blocking
 *
 * @returns { blocked: BlockedUser }
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  // Parse request body
  let body: Partial<BlockUserInput> & { blocked_user_id?: unknown };
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON body');
  }

  const { blocked_user_id, block_messages, block_connections, block_pymk, block_reason } = body;

  // Validate required fields
  if (!blocked_user_id || typeof blocked_user_id !== 'number') {
    throw BizError.badRequest('blocked_user_id is required and must be a number');
  }

  if (typeof block_messages !== 'boolean') {
    throw BizError.badRequest('block_messages is required and must be a boolean');
  }

  if (typeof block_connections !== 'boolean') {
    throw BizError.badRequest('block_connections is required and must be a boolean');
  }

  if (typeof block_pymk !== 'boolean') {
    throw BizError.badRequest('block_pymk is required and must be a boolean');
  }

  // Must block at least one area
  if (!block_messages && !block_connections && !block_pymk) {
    throw BizError.badRequest('Must select at least one area to block');
  }

  // Validate optional reason
  if (block_reason !== undefined && typeof block_reason !== 'string') {
    throw BizError.badRequest('block_reason must be a string');
  }

  const input: BlockUserInput = {
    blocked_user_id,
    block_messages,
    block_connections,
    block_pymk,
    block_reason: block_reason || undefined
  };

  const connectionService = getConnectionService();
  const blocked = await connectionService.blockUser(userId, input);

  return createSuccessResponse({
    blocked
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * DELETE /api/users/connections/blocked
 *
 * Unblock a user completely (remove from blacklist)
 *
 * Body:
 * - blocked_user_id: number (required) - The user ID to unblock
 *
 * @returns { success: true }
 */
export const DELETE = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  // Parse request body
  let body: { blocked_user_id?: unknown };
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON body');
  }

  const { blocked_user_id } = body;

  // Validate required field
  if (!blocked_user_id || typeof blocked_user_id !== 'number') {
    throw BizError.badRequest('blocked_user_id is required and must be a number');
  }

  const connectionService = getConnectionService();
  await connectionService.unblockUser(userId, blocked_user_id);

  return createSuccessResponse({ success: true }, context.requestId);
}, {
  requireAuth: true
});
