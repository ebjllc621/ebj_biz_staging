/**
 * Conversation API Route
 * GET /api/messages/conversations/[otherUserId] - Get conversation with specific user
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_1_CORE_INFRASTRUCTURE_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { MessageService } from '@features/messaging/services/MessageService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new MessageService(db);
  const userId = parseInt(context.userId!, 10);

  // Extract otherUserId from URL
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const otherUserIdStr = pathParts[pathParts.length - 1];

  if (!otherUserIdStr) {
    throw BizError.badRequest('Invalid user ID');
  }

  const otherUserId = parseInt(otherUserIdStr, 10);

  if (isNaN(otherUserId)) {
    throw BizError.badRequest('Invalid user ID');
  }

  // Get pagination params
  const searchParams = url.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const messages = await service.getConversation(userId, otherUserId, limit, offset);

  // Mark conversation as read
  await service.markThreadAsRead(userId, otherUserId);

  return createSuccessResponse({
    messages,
    other_user_id: otherUserId,
    limit,
    offset
  }, context.requestId);
}, {
  requireAuth: true
});
