/**
 * Individual Quote API Route
 *
 * GET    /api/quotes/[quoteId] - Get quote details
 * PATCH  /api/quotes/[quoteId] - Update quote
 * DELETE /api/quotes/[quoteId] - Cancel quote
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
import type { UpdateQuoteInput } from '@features/quotes/types';

/**
 * GET /api/quotes/[quoteId]
 * Get quote details (requester or authorized responder)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const quoteId = parseInt(segments[segments.indexOf('quotes') + 1]!, 10);

  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  const quoteService = getQuoteService();
  const quote = await quoteService.getQuote(quoteId, user.id);

  return createSuccessResponse({ quote }, context.requestId);
});

/**
 * PATCH /api/quotes/[quoteId]
 * Update quote fields
 */
export const PATCH = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const quoteId = parseInt(segments[segments.indexOf('quotes') + 1]!, 10);

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

  const input: UpdateQuoteInput = {};
  if (requestBody.title !== undefined) input.title = requestBody.title as string;
  if (requestBody.description !== undefined) input.description = requestBody.description as string;
  if (requestBody.serviceCategory !== undefined) input.serviceCategory = requestBody.serviceCategory as string;
  if (requestBody.timeline !== undefined) input.timeline = requestBody.timeline as UpdateQuoteInput['timeline'];
  if (requestBody.budgetMin !== undefined) input.budgetMin = requestBody.budgetMin as number;
  if (requestBody.budgetMax !== undefined) input.budgetMax = requestBody.budgetMax as number;
  if (requestBody.preferredStartDate !== undefined) input.preferredStartDate = requestBody.preferredStartDate as string;
  if (requestBody.status !== undefined) input.status = requestBody.status as UpdateQuoteInput['status'];
  if (requestBody.expiresAt !== undefined) input.expiresAt = requestBody.expiresAt as string;

  const quoteService = getQuoteService();
  const quote = await quoteService.updateQuote(quoteId, user.id, input);

  return createSuccessResponse({ quote }, context.requestId);
}));

/**
 * DELETE /api/quotes/[quoteId]
 * Cancel (soft-delete) a quote
 */
export const DELETE = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const url = new URL(context.request.url);
  const segments = url.pathname.split('/');
  const quoteId = parseInt(segments[segments.indexOf('quotes') + 1]!, 10);

  if (isNaN(quoteId)) throw BizError.badRequest('Invalid quote ID');

  const quoteService = getQuoteService();
  await quoteService.deleteQuote(quoteId, user.id);

  return createSuccessResponse({ message: 'Quote cancelled successfully' }, context.requestId);
}));
