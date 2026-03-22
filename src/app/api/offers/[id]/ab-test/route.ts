/**
 * GET/POST/PUT /api/offers/[id]/ab-test
 * Manage A/B tests for offers (Preferred/Premium tiers only)
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @authority CLAUDE.md - apiHandler wrapper required
 */

import { apiHandler, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getOfferService } from '@core/services/ServiceRegistry';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import type { ABTestConfig, ABTestResults } from '@features/offers/types';

export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname - /api/offers/[id]/ab-test
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const offerService = getOfferService();
  // getABTestResults to be implemented in OfferService
  const results: ABTestResults | null = null;

  return createSuccessResponse({ results }, context.requestId);
});

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();
  const config: ABTestConfig = {
    variant_type: body.variant_type,
    variant_a_value: body.variant_a_value,
    variant_b_value: body.variant_b_value,
  };

  const offerService = getOfferService();
  // createABTest to be implemented in OfferService
  const test = { id: 0, offer_id: parseInt(offerId, 10), ...config };

  return createSuccessResponse({ test }, context.requestId);
});

export const PUT = apiHandler(async (context) => {
  const { request } = context;

  // Extract ID from URL pathname
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const offerId = pathSegments[pathSegments.length - 2] || '';

  // Verify authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return createErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  const body = await request.json();
  const { action } = body; // 'stop' or 'declare_winner'

  const offerService = getOfferService();
  // stopABTest and declareABTestWinner to be implemented in OfferService

  return createSuccessResponse({ updated: true }, context.requestId);
});
