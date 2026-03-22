/**
 * Quote Messages API Route
 *
 * GET  /api/quotes/[quoteId]/messages - Get message thread
 * POST /api/quotes/[quoteId]/messages - Send a message
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { withCsrf } from '@/lib/security/withCsrf';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getQuoteService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

function getQuoteIdFromUrl(request: Request): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const quotesIndex = segments.indexOf('quotes');
  return parseInt(segments[quotesIndex + 1]!, 10);
}

/**
 * GET /api/quotes/[quoteId]/messages
 * Get messages for a quote thread (optionally filtered by responseId)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const quoteId = getQuoteIdFromUrl(context.request);
  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  const { searchParams } = new URL(context.request.url);
  const responseIdParam = searchParams.get('responseId');
  const responseId = responseIdParam ? parseInt(responseIdParam, 10) : undefined;

  const quoteService = getQuoteService();
  const messages = await quoteService.getQuoteMessages(quoteId, user.id, responseId);

  return createSuccessResponse({ messages }, context.requestId);
});

/**
 * POST /api/quotes/[quoteId]/messages
 * Send a message in a quote thread
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const quoteId = getQuoteIdFromUrl(context.request);
  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  if (!requestBody.content || typeof requestBody.content !== 'string' || !requestBody.content.trim()) {
    throw BizError.validation('content', requestBody.content, 'Message content is required');
  }

  const content = (requestBody.content as string).trim();
  const responseId = requestBody.responseId as number | undefined;

  const quoteService = getQuoteService();
  const message = await quoteService.sendQuoteMessage(user.id, quoteId, content, responseId);

  return createSuccessResponse({ message }, context.requestId);
}));
