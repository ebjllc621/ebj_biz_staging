/**
 * Quote Requests API Route
 *
 * GET  /api/quotes/[quoteId]/requests - List requests for a quote
 * POST /api/quotes/[quoteId]/requests - Send quote to a target
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
import type { CreateQuoteRequestInput, QuoteTargetType } from '@features/quotes/types';

function getQuoteIdFromUrl(request: Request): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const quotesIndex = segments.indexOf('quotes');
  return parseInt(segments[quotesIndex + 1]!, 10);
}

/**
 * GET /api/quotes/[quoteId]/requests
 * List all requests for a quote
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const quoteId = getQuoteIdFromUrl(context.request);
  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  const quoteService = getQuoteService();
  const requests = await quoteService.getQuoteRequests(quoteId, user.id);

  return createSuccessResponse({ requests }, context.requestId);
});

/**
 * POST /api/quotes/[quoteId]/requests
 * Send this quote to a target (listing, group, or user)
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

  const validTargetTypes: QuoteTargetType[] = ['listing', 'group', 'user'];
  if (!requestBody.targetType || !validTargetTypes.includes(requestBody.targetType as QuoteTargetType)) {
    throw BizError.validation('targetType', requestBody.targetType, 'Must be listing, group, or user');
  }

  const input: CreateQuoteRequestInput = {
    quoteId,
    targetType: requestBody.targetType as QuoteTargetType,
    targetListingId: requestBody.targetListingId as number | undefined,
    targetGroupId: requestBody.targetGroupId as number | undefined,
    targetUserId: requestBody.targetUserId as number | undefined
  };

  const quoteService = getQuoteService();
  const quoteRequest = await quoteService.sendQuoteRequest(user.id, input);

  return createSuccessResponse({ quoteRequest }, context.requestId);
}));
