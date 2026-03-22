/**
 * Individual Quote Response API Route
 *
 * PATCH /api/quotes/[quoteId]/responses/[responseId] - Update a bid
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
import type { UpdateQuoteResponseInput } from '@features/quotes/types';

function getResponseIdFromUrl(request: Request): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const responsesIndex = segments.indexOf('responses');
  return parseInt(segments[responsesIndex + 1]!, 10);
}

/**
 * PATCH /api/quotes/[quoteId]/responses/[responseId]
 * Update a bid (responder only)
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const responseId = getResponseIdFromUrl(context.request);
  if (isNaN(responseId)) throw BizError.badRequest('Invalid response ID');

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

  const input: UpdateQuoteResponseInput = {};
  if (requestBody.bidAmount !== undefined) input.bidAmount = requestBody.bidAmount as number;
  if (requestBody.bidDescription !== undefined) input.bidDescription = requestBody.bidDescription as string;
  if (requestBody.estimatedDuration !== undefined) input.estimatedDuration = requestBody.estimatedDuration as string;
  if (requestBody.validUntil !== undefined) input.validUntil = requestBody.validUntil as string;
  if (requestBody.status !== undefined) input.status = requestBody.status as UpdateQuoteResponseInput['status'];

  const quoteService = getQuoteService();
  const response = await quoteService.updateQuoteResponse(responseId, user.id, input);

  return createSuccessResponse({ response }, context.requestId);
}));
