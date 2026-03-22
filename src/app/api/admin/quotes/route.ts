/**
 * Admin Quotes API Route
 *
 * GET /api/admin/quotes - List all quotes (admin only)
 *
 * @tier STANDARD
 * @phase Phase 3 Tech Debt Remediation
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getQuoteService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';
import type { GetQuotesOptions, QuoteStatus, QuoteVisibility } from '@features/quotes/types';

/**
 * GET /api/admin/quotes
 * List all quotes system-wide with optional filters and pagination
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const user = await getUserFromRequest(context.request);
  if (!user) throw BizError.unauthorized('Authentication required');
  if (user.role !== 'admin') throw BizError.forbidden('access admin quotes', 'admin');

  const { searchParams } = new URL(context.request.url);

  const options: GetQuotesOptions = {
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    orderBy: (searchParams.get('orderBy') as GetQuotesOptions['orderBy']) ?? 'created_at',
    orderDir: (searchParams.get('orderDir') as 'ASC' | 'DESC') ?? 'DESC'
  };

  const status = searchParams.get('status');
  if (status) options.status = status as QuoteStatus;

  const serviceCategory = searchParams.get('serviceCategory');
  if (serviceCategory) options.serviceCategory = serviceCategory;

  const visibility = searchParams.get('visibility');
  if (visibility) options.visibility = visibility as QuoteVisibility;

  const quoteService = getQuoteService();
  const result = await quoteService.getQuotesAdmin(options);

  return createSuccessResponse({
    quotes: result.items,
    pagination: {
      total: result.total,
      limit: options.limit!,
      offset: options.offset!
    }
  }, context.requestId);
});
