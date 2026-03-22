/**
 * POST /api/sharing/track-click - Track click on shared link
 *
 * Resolves a short code to the full redirect URL.
 * Auth not required — public click tracking.
 *
 * @tier STANDARD
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/app/api/listings/[id]/shares/route.ts - apiHandler pattern
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getVanityURLService } from '@core/services/VanityURLService';

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Parse request body
  let body: { shortCode: string; referrer?: string };

  try {
    body = await request.json();
  } catch {
    return createErrorResponse(BizError.badRequest('Invalid JSON body'), 400);
  }

  const { shortCode, referrer: _referrer } = body;

  if (!shortCode || typeof shortCode !== 'string') {
    return createErrorResponse(BizError.badRequest('shortCode is required'), 400);
  }

  const service = getVanityURLService();
  const redirectUrl = await service.resolveAndTrack(shortCode);

  if (!redirectUrl) {
    return createErrorResponse(
      BizError.notFound('Short URL', shortCode),
      404
    );
  }

  return createSuccessResponse({ redirectUrl }, 200);
});
