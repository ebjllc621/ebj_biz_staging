/**
 * Message Reactions API Route
 * GET    /api/messages/[messageId]/reactions - Get reactions for a message
 * POST   /api/messages/[messageId]/reactions - Add a reaction
 * DELETE /api/messages/[messageId]/reactions - Remove a reaction
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { BizError } from '@core/errors/BizError';
import { getDatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber } from '@core/utils/bigint';
import { STANDARD_REACTIONS } from '@features/messaging/types';

function extractMessageId(context: ApiContext): number {
  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const messageIdIndex = pathParts.indexOf('messages') + 1;
  const messageId = parseInt(pathParts[messageIdIndex] || '', 10);
  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID');
  }
  return messageId;
}

/**
 * GET /api/messages/[messageId]/reactions
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const messageId = extractMessageId(context);

  const result = await db.query(
    `SELECT r.emoji, COUNT(*) as count,
            MAX(CASE WHEN r.user_id = ? THEN 1 ELSE 0 END) as reacted_by_me,
            GROUP_CONCAT(JSON_OBJECT('user_id', r.user_id, 'username', u.username) SEPARATOR '|||') as users_json
     FROM message_reactions r
     JOIN users u ON u.id = r.user_id
     WHERE r.message_id = ?
     GROUP BY r.emoji
     ORDER BY MIN(r.created_at)`,
    [userId, messageId]
  );

  const reactions = (result.rows as Array<{ emoji: string; count: number | bigint; reacted_by_me: number | bigint; users_json: string }>).map(row => ({
    emoji: row.emoji,
    count: bigIntToNumber(row.count),
    reacted_by_me: bigIntToNumber(row.reacted_by_me) === 1,
    users: row.users_json
      ? row.users_json.split('|||').map((u: string) => {
          const parsed = JSON.parse(u);
          return { user_id: parsed.user_id, username: parsed.username };
        })
      : []
  }));

  return createSuccessResponse({ reactions }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/messages/[messageId]/reactions
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const messageId = extractMessageId(context);

  const body = await context.request.json() as { emoji: string };

  if (!body.emoji || !STANDARD_REACTIONS.includes(body.emoji as typeof STANDARD_REACTIONS[number])) {
    throw BizError.badRequest('Invalid emoji reaction');
  }

  // Verify user is sender or receiver of this message
  const msgResult = await db.query(
    `SELECT id FROM user_message WHERE id = ? AND (sender_user_id = ? OR receiver_user_id = ?)`,
    [messageId, userId, userId]
  );

  if (msgResult.rows.length === 0) {
    throw BizError.notFound('Message not found');
  }

  // Insert reaction (ignore duplicate)
  await db.query(
    `INSERT IGNORE INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`,
    [messageId, userId, body.emoji]
  );

  return createSuccessResponse({ message: 'Reaction added' }, context.requestId);
}, {
  requireAuth: true
}));

/**
 * DELETE /api/messages/[messageId]/reactions
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const userId = parseInt(context.userId!, 10);
  const messageId = extractMessageId(context);

  const body = await context.request.json() as { emoji: string };

  if (!body.emoji) {
    throw BizError.badRequest('emoji is required');
  }

  await db.query(
    `DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?`,
    [messageId, userId, body.emoji]
  );

  return createSuccessResponse({ message: 'Reaction removed' }, context.requestId);
}, {
  requireAuth: true
}));
