/**
 * Messages API Route
 * GET /api/messages - Get message threads for authenticated user
 * POST /api/messages - Send new message
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Error handling: BizError-based custom errors
 * - Authentication: Required
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_1_CORE_INFRASTRUCTURE_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/connections/requests/route.ts
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { MessageService } from '@features/messaging/services/MessageService';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { bigIntToNumber } from '@core/utils/bigint';
import type { MessageThread } from '@features/messaging/types';

/**
 * GET /api/messages
 * Get message threads for the authenticated user (inbox view)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new MessageService(db);
  const userId = parseInt(context.userId!, 10);

  const threads = await service.getUserThreads(userId);
  const unreadCount = await service.getUnreadCount(userId);

  // Also fetch group message threads
  const groupThreads = await getGroupMessageThreads(db, userId);

  // Merge and sort by most recent message
  const allThreads = [...threads, ...groupThreads].sort((a, b) => {
    const aTime = new Date(a.last_message_at).getTime();
    const bTime = new Date(b.last_message_at).getTime();
    return bTime - aTime;
  });

  return createSuccessResponse({
    threads: allThreads,
    unread_count: unreadCount
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/messages
 * Send a new message
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new MessageService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();
  const { receiver_user_id, subject, content, message_type, reply_to_id } = body;

  if (!receiver_user_id) {
    throw BizError.badRequest('receiver_user_id is required');
  }

  if (!content || content.trim().length === 0) {
    throw BizError.badRequest('Message content is required');
  }

  if (content.length > 5000) {
    throw BizError.badRequest('Message content exceeds maximum length of 5000 characters');
  }

  const message = await service.sendMessage({
    sender_user_id: userId,
    receiver_user_id: parseInt(receiver_user_id, 10),
    subject: subject?.trim() || undefined,
    content: content.trim(),
    message_type: message_type || 'text',
    reply_to_id: reply_to_id ? parseInt(reply_to_id, 10) : undefined
  });

  return createSuccessResponse({
    message,
    status: 'Message sent successfully'
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * Fetch group message threads for a user (both owned and member groups).
 * Returns them shaped like MessageThread for unified inbox display.
 */
async function getGroupMessageThreads(
  db: ReturnType<typeof getDatabaseService>,
  userId: number
): Promise<MessageThread[]> {
  try {
    const result = await db.query(
      `SELECT
        cg.id AS group_id,
        cg.name AS group_name,
        cg.color AS group_color,
        gm.content AS last_message_content,
        gm.created_at AS last_message_at,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        (
          SELECT COUNT(*)
          FROM group_messages gm2
          WHERE gm2.group_id = cg.id
            AND gm2.is_deleted = FALSE
            AND gm2.id > COALESCE(
              (SELECT gmr.last_read_message_id FROM group_message_reads gmr
               WHERE gmr.group_id = cg.id AND gmr.user_id = ?),
              0
            )
            AND gm2.sender_user_id != ?
        ) AS unread_count,
        (
          SELECT COUNT(*) FROM group_messages gm3
          WHERE gm3.group_id = cg.id AND gm3.is_deleted = FALSE
        ) AS total_messages
      FROM connection_groups cg
      INNER JOIN group_messages gm ON gm.group_id = cg.id
        AND gm.id = (
          SELECT MAX(gm4.id) FROM group_messages gm4
          WHERE gm4.group_id = cg.id AND gm4.is_deleted = FALSE
        )
      LEFT JOIN users u ON gm.sender_user_id = u.id
      WHERE (
        cg.user_id = ?
        OR cg.id IN (
          SELECT cgm.group_id FROM connection_group_members cgm
          WHERE cgm.member_user_id = ?
        )
      )
      AND cg.is_archived = FALSE
      ORDER BY gm.created_at DESC`,
      [userId, userId, userId, userId]
    );

    const rows = result.rows as Record<string, unknown>[];
    return rows.map((row) => ({
      thread_id: `group_${row.group_id}`,
      other_user_id: 0,
      other_username: row.group_name as string,
      other_display_name: row.group_name as string,
      other_avatar_url: null,
      last_message_content: row.last_message_content as string,
      last_message_at: row.last_message_at as Date,
      unread_count: bigIntToNumber(row.unread_count as bigint | number),
      total_messages: bigIntToNumber(row.total_messages as bigint | number),
      is_group_thread: true,
      group_id: row.group_id as number,
      group_name: row.group_name as string,
      group_color: row.group_color as string
    }));
  } catch {
    // If group_messages table doesn't exist or query fails, return empty
    return [];
  }
}
