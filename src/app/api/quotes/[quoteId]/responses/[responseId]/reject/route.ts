/**
 * Reject Quote Response API Route
 *
 * POST /api/quotes/[quoteId]/responses/[responseId]/reject - Reject a bid
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

function getResponseIdFromUrl(request: Request): number {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const responsesIndex = segments.indexOf('responses');
  return parseInt(segments[responsesIndex + 1]!, 10);
}

/**
 * POST /api/quotes/[quoteId]/responses/[responseId]/reject
 * Reject a bid (quote requester only)
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');

  const responseId = getResponseIdFromUrl(context.request);
  if (isNaN(responseId)) throw BizError.badRequest('Invalid response ID');

  const quoteService = getQuoteService();
  await quoteService.rejectResponse(responseId, user.id);

  return createSuccessResponse({ message: 'Response rejected successfully' }, context.requestId);
}));
