/**
 * Admin Lighthouse Test Runner API - Batch Tests
 *
 * POST /api/admin/lighthouse/batch
 *
 * NOTE: Lighthouse tests cannot run in API context due to Chrome process spawning
 * and 30-60s execution times per page. This endpoint returns CLI instructions instead.
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';

export const dynamic = 'force-dynamic';

// Page counts for estimation
const PAGE_COUNTS: Record<string, number> = {
  public: 5,
  dashboard: 18,
  admin: 25,
  all: 48,
};

export const POST = apiHandler(
  async (context: ApiContext) => {
    const body = await context.request.json();
    const { category } = body;

    const validCategory = ['public', 'dashboard', 'admin', 'all'].includes(category) ? category : 'public';
    const pageCount = PAGE_COUNTS[validCategory] || 5;
    const estimatedMinutes = Math.ceil((pageCount * 45) / 60); // ~45s per page average

    // Return CLI instructions instead of trying to run in API context
    return createSuccessResponse({
      canRunInApi: false,
      message: 'Lighthouse batch tests must be run via CLI for reliability.',
      reason: `Testing ${pageCount} pages would take ~${estimatedMinutes} minutes, exceeding API timeout limits.`,
      cliCommand: validCategory === 'all'
        ? 'npm run lighthouse:all'
        : `npm run lighthouse:${validCategory}`,
      category: validCategory,
      pageCount,
      estimatedTime: `${estimatedMinutes} minutes`,
      instructions: [
        '1. Open a terminal in the project root',
        `2. Run: npm run lighthouse:${validCategory}`,
        `3. Wait ~${estimatedMinutes} minutes for completion`,
        '4. Results will be saved to tests/pagePerformance/reports/',
        '5. Return here and click "Load" to view results',
      ],
    });
  },
  {
    requireAuth: true,
    rateLimit: {
      requests: 10,
      windowMs: 60000,
    },
  }
);
