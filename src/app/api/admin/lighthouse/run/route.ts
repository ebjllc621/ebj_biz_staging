/**
 * Admin Lighthouse Test Runner API - Run Single Page
 *
 * POST /api/admin/lighthouse/run
 *
 * NOTE: Lighthouse tests cannot run in API context due to Chrome process spawning
 * and 30-60s execution times. This endpoint returns CLI instructions instead.
 *
 * @authority .cursor/rules/admin-api-route-standard.mdc
 * @governance apiHandler wrapper, admin auth required
 */

import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';

export const dynamic = 'force-dynamic';

export const POST = apiHandler(
  async (context: ApiContext) => {
    const body = await context.request.json();
    const { url, category } = body;

    // Validation
    if (!url || typeof url !== 'string') {
      return createErrorResponse('URL is required', 400);
    }

    const detectedCategory = url.includes('/admin') ? 'admin' :
                             url.includes('/dashboard') ? 'dashboard' :
                             category || 'public';

    // Return CLI instructions instead of trying to run in API context
    // Lighthouse spawns Chrome processes and takes 30-60s per page
    return createSuccessResponse({
      canRunInApi: false,
      message: 'Lighthouse tests must be run via CLI for reliability.',
      reason: 'Tests spawn Chrome processes and take 30-60 seconds per page, which exceeds API timeout limits.',
      cliCommand: `npx lhci autorun --collect.url="${url}" --config=tests/pagePerformance/config/lighthouse.${detectedCategory}.js`,
      alternativeCommand: `npm run lighthouse:${detectedCategory}`,
      url,
      category: detectedCategory,
      instructions: [
        '1. Open a terminal in the project root',
        `2. Run: npm run lighthouse:${detectedCategory}`,
        '3. Results will be saved to tests/pagePerformance/reports/',
        '4. Return here and click "Load" to view results',
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
