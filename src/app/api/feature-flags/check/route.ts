/**
 * Public Feature Flag Check API Route
 * GET /api/feature-flags/check?flag=<flagKey>&userId=<userId>&tier=<tier>
 *
 * Public endpoint for checking feature flag status
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 4.2
 * @remediation Phase R2.0.1 - API handler enforcement
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext } from '@core/api/apiHandler';
import { createSuccessResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { FeatureFlagService, Environment } from '@core/services/FeatureFlagService';
import { BizError } from '@core/errors/BizError';

async function handleGet(context: ApiContext) {
const { searchParams } = new URL(context.request.url);
    const flagKey = searchParams.get('flag');
    const userIdStr = searchParams.get('userId');
    const tier = searchParams.get('tier');
    const environmentStr = searchParams.get('environment');

    if (!flagKey) {
      throw BizError.badRequest('flag parameter is required');
    }

    const db = getDatabaseService();
    const service = new FeatureFlagService(db);

    const enabled = await service.isFeatureEnabled(flagKey, {
      userId: userIdStr ? parseInt(userIdStr) : undefined,
      tier: tier || undefined,
      environment: environmentStr as Environment || undefined
    });

    return createSuccessResponse({ enabled, flag: flagKey });
}

export const GET = apiHandler(handleGet, {
  allowedMethods: ['GET'],
  requireAuth: true
});
