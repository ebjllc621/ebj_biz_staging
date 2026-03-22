/**
 * Group Message Reactions API Route
 * GET    /api/users/connections/groups/[groupId]/messages/[messageId]/reactions - Get reactions
 * POST   /api/users/connections/groups/[groupId]/messages/[messageId]/reactions - Add reaction
 * DELETE /api/users/connections/groups/[groupId]/messages/[messageId]/reactions - Remove reaction
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getConnectionGroupService } from '@core/services/ServiceRegistry';
import { bigIntToNumber } from '@core/utils/bigint';
import { STANDARD_REACTIONS } from '@features/messaging/types';

function extractIds(context: ApiContext): { groupId: number; messageId: number } {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');

  const groupIdIndex = pathParts.indexOf('groups') + 1;
  const groupId = parseInt(pathParts[groupIdIndex] || '', 10);

  const messageIdIndex = pathParts.indexOf('messages') + 1;
  const messageId = parseInt(pathParts[messageIdIndex] || '', 10);

  if (isNaN(groupId)) throw BizError.badRequest('Invalid group ID');
  if (isNaN(messageId)) throw BizError.badRequest('Invalid message ID');

  return { groupId, messageId };
}

async function verifyGroupAccess(groupId: number, userId: number): Promise<void> {
  const service = getConnectionGroupService();
  const hasAccess = await service.verifyGroupAccess(groupId, userId);
  if (!hasAccess) {
    throw BizError.forbidden('No access to this group');
  }
}

/**
 * GET /api/users/connections/groups/[groupId]/messages/[messageId]/reactions
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, messageId } = extractIds(context);

  await verifyGroupAccess(groupId, userId);

  const result = await db.query(
    `SELECT r.emoji, COUNT(*) as count,
            MAX(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) as reacted_by_me,
            GROUP_CONCAT(JSON_OBJECT('user_id', r.user_id, 'username', u.username) SEPARATOR '|||') as users_json
     FROM group_message_reactions r
     JOIN users u ON u.id = r.user_id
     WHERE r.message_id = ?
     GROUP BY r.emoji
     ORDER BY MIN(r.created_at)`,
    [userId, messageId]
  );

  const reactions = (result.rows as Array<{ emoji: string; count: number | bigint; reacted_by_me: number | bigint; users_json: string }>).map(row => ({
    emoji: row.emoji,
    count: bigIntToNumber(row.count),
    reactedByMe: bigIntToNumber(row.reacted_by_me) === 1,
    users: row.users_json
      ? row.users_json.split('|||').map((u: string) => {
          const parsed = JSON.parse(u);
          return { userId: parsed.user_id, username: parsed.username };
        })
      : []
  }));

  return createSuccessResponse({ reactions }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/users/connections/groups/[groupId]/messages/[messageId]/reactions
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, messageId } = extractIds(context);

  await verifyGroupAccess(groupId, userId);

  const body = await context.request.json() as { emoji: string };

  if (!body.emoji || !STANDARD_REACTIONS.includes(body.emoji as typeof STANDARD_REACTIONS[number])) {
    throw BizError.badRequest('Invalid emoji reaction');
  }

  // Verify message belongs to this group
  const msgResult = await db.query(
    `SELECT id FROM group_messages WHERE id = ? AND group_id = ? AND is_deleted = FALSE`,
    [messageId, groupId]
  );
  if (msgResult.rows.length === 0) {
    throw BizError.notFound('Message not found');
  }

  await db.query(
    `INSERT IGNORE INTO group_message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
    [messageId, userId, body.emoji]
  );

  return createSuccessResponse({ message: 'Reaction added' }, context.requestId);
}, {
  requireAuth: true
}));

/**
 * DELETE /api/users/connections/groups/[groupId]/messages/[messageId]/reactions
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const { groupId, messageId } = extractIds(context);

  await verifyGroupAccess(groupId, userId);

  const body = await context.request.json() as { emoji: string };

  if (!body.emoji) {
    throw BizError.badRequest('emoji is required');
  }

  await db.query(
    `DELETE FROM group_message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
    [messageId, userId, body.emoji]
  );

  return createSuccessResponse({ message: 'Reaction removed' }, context.requestId);
}, {
  requireAuth: true
}));
