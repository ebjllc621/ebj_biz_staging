/**
 * Quotes API Route
 *
 * GET  /api/quotes - List user's quotes
 * POST /api/quotes - Create a new quote
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
import type { CreateQuoteInput, GetQuotesOptions, QuoteStatus, QuoteVisibility } from '@features/quotes/types';

/**
 * GET /api/quotes
 * List authenticated user's quotes with optional filtering
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const { searchParams } = new URL(context.request.url);

  const options: GetQuotesOptions = {
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    orderBy: (searchParams.get('orderBy') as GetQuotesOptions['orderBy']) ?? 'created_at',
    orderDir: (searchParams.get('orderDir') as 'ASC' | 'DESC') ?? 'DESC'
  };

  const status = searchParams.get('status');
  if (status) {
    options.status = status as QuoteStatus;
  }

  const serviceCategory = searchParams.get('serviceCategory');
  if (serviceCategory) {
    options.serviceCategory = serviceCategory;
  }

  const visibility = searchParams.get('visibility');
  if (visibility) {
    options.visibility = visibility as QuoteVisibility;
  }

  const quoteService = getQuoteService();
  const result = await quoteService.getUserQuotes(user.id, options);

  return createSuccessResponse(result, context.requestId);
});

/**
 * POST /api/quotes
 * Create a new quote
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

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

  if (!requestBody.title || typeof requestBody.title !== 'string' || !requestBody.title.trim()) {
    throw BizError.validation('title', requestBody.title, 'Title is required');
  }

  if (!requestBody.description || typeof requestBody.description !== 'string' || !requestBody.description.trim()) {
    throw BizError.validation('description', requestBody.description, 'Description is required');
  }

  const input: CreateQuoteInput = {
    title: (requestBody.title as string).trim(),
    description: (requestBody.description as string).trim(),
    serviceCategory: requestBody.serviceCategory as string | undefined,
    timeline: requestBody.timeline as CreateQuoteInput['timeline'] | undefined,
    budgetMin: requestBody.budgetMin as number | undefined,
    budgetMax: requestBody.budgetMax as number | undefined,
    preferredStartDate: requestBody.preferredStartDate as string | undefined,
    locationAddress: requestBody.locationAddress as string | undefined,
    locationCity: requestBody.locationCity as string | undefined,
    locationState: requestBody.locationState as string | undefined,
    locationZip: requestBody.locationZip as string | undefined,
    visibility: requestBody.visibility as CreateQuoteInput['visibility'] | undefined,
    expiresAt: requestBody.expiresAt as string | undefined
  };

  const quoteService = getQuoteService();
  const quote = await quoteService.createQuote(user.id, input);

  return createSuccessResponse({ quote }, context.requestId);
}));
