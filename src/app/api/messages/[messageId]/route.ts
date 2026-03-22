/**
 * Single Message API Route
 * GET /api/messages/[messageId] - Get specific message
 * PUT /api/messages/[messageId] - Update message (mark as read)
 * DELETE /api/messages/[messageId] - Delete message (soft delete)
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

  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const messageIdStr = pathParts[pathParts.length - 1];

  if (!messageIdStr) {
    throw BizError.badRequest('Invalid message ID');
  }

  const messageId = parseInt(messageIdStr, 10);

  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID');
  }

  const message = await service.getMessageById(messageId, userId);

  if (!message) {
    throw BizError.notFound('Message not found');
  }

  return createSuccessResponse({ message }, context.requestId);
}, {
  requireAuth: true
});

export const PUT = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new MessageService(db);
  const userId = parseInt(context.userId!, 10);

  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const messageIdStr = pathParts[pathParts.length - 1];

  if (!messageIdStr) {
    throw BizError.badRequest('Invalid message ID');
  }

  const messageId = parseInt(messageIdStr, 10);

  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID');
  }

  const body = await context.request.json();
  const { status } = body;

  if (status === 'read') {
    await service.markAsRead(messageId, userId);
  }

  const message = await service.getMessageById(messageId, userId);

  return createSuccessResponse({
    message,
    status: 'Message updated successfully'
  }, context.requestId);
}, {
  requireAuth: true
});

export const DELETE = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new MessageService(db);
  const userId = parseInt(context.userId!, 10);

  const url = new URL(context.request.url);
  const pathParts = url.pathname.split('/');
  const messageIdStr = pathParts[pathParts.length - 1];

  if (!messageIdStr) {
    throw BizError.badRequest('Invalid message ID');
  }

  const messageId = parseInt(messageIdStr, 10);

  if (isNaN(messageId)) {
    throw BizError.badRequest('Invalid message ID');
  }

  await service.deleteMessage(messageId, userId);

  return createSuccessResponse({
    status: 'Message deleted successfully'
  }, context.requestId);
}, {
  requireAuth: true
});
