/**
 * Quote Responses API Route
 *
 * GET  /api/quotes/[quoteId]/responses - List responses/bids for a quote
 * POST /api/quotes/[quoteId]/responses - Submit a bid
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
import type { CreateQuoteResponseInput, GetQuoteResponsesOptions, QuoteResponseStatus } from '@features/quotes/types';

function getQuoteIdFromUrl(request: Request): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const quotesIndex = segments.indexOf('quotes');
  return parseInt(segments[quotesIndex + 1]!, 10);
}

/**
 * GET /api/quotes/[quoteId]/responses
 * List all responses/bids for a quote
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const quoteId = getQuoteIdFromUrl(context.request);
  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  const { searchParams } = new URL(context.request.url);

  const options: GetQuoteResponsesOptions = {
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    orderBy: (searchParams.get('orderBy') as GetQuoteResponsesOptions['orderBy']) ?? 'created_at',
    orderDir: (searchParams.get('orderDir') as 'ASC' | 'DESC') ?? 'DESC'
  };

  const status = searchParams.get('status');
  if (status) {
    options.status = status as QuoteResponseStatus;
  }

  const quoteService = getQuoteService();
  const result = await quoteService.getQuoteResponses(quoteId, user.id, options);

  return createSuccessResponse(result, context.requestId);
});

/**
 * POST /api/quotes/[quoteId]/responses
 * Submit a bid/response to a quote
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

  if (!requestBody.bidDescription || typeof requestBody.bidDescription !== 'string' || !requestBody.bidDescription.trim()) {
    throw BizError.validation('bidDescription', requestBody.bidDescription, 'Bid description is required');
  }

  const input: CreateQuoteResponseInput = {
    quoteId,
    quoteRequestId: requestBody.quoteRequestId as number | undefined,
    bidAmount: requestBody.bidAmount as number | undefined,
    bidDescription: (requestBody.bidDescription as string).trim(),
    estimatedDuration: requestBody.estimatedDuration as string | undefined,
    validUntil: requestBody.validUntil as string | undefined,
    responderListingId: requestBody.responderListingId as number | undefined
  };

  const quoteService = getQuoteService();
  const response = await quoteService.createQuoteResponse(user.id, input);

  return createSuccessResponse({ response }, context.requestId);
}));
