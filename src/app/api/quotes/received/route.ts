/**
 * Received Quote Requests API Route
 *
 * GET /api/quotes/received - Get received quote requests targeting user's listings
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getQuoteService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { GetQuotesOptions, QuoteRequestStatus } from '@features/quotes/types';

/**
 * GET /api/quotes/received
 * List received quote requests (targeting user's listings)
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const { searchParams } = new URL(context.request.url);

  const options: GetQuotesOptions = {
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0
  };

  const status = searchParams.get('status');
  if (status) {
    options.status = status as QuoteRequestStatus as unknown as GetQuotesOptions['status'];
  }

  const quoteService = getQuoteService();
  const result = await quoteService.getReceivedQuoteRequests(user.id, options);

  return createSuccessResponse(result, context.requestId);
});
