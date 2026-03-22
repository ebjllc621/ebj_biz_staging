/**
 * POST /api/sharing/social - Generate UTM-tagged share link
 *
 * Generates a UTM-tagged share URL for any entity type.
 * Optionally creates a short URL if generateShortUrl is true.
 * Auth is optional — anonymous shares are allowed.
 *
 * @tier STANDARD
 * @phase Phase 1B - Entity-Agnostic Services & UI Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_1B_BRAIN_PLAN.md
 * @reference src/app/api/listings/[id]/shares/route.ts - apiHandler pattern
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { BizError } from '@core/errors/BizError';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getSocialShareService } from '@core/services/SocialShareService';
import type { EntityType } from '@core/services/SocialShareService';

const VALID_ENTITY_TYPES: EntityType[] = ['listing', 'offer', 'event', 'job'];

export const POST = apiHandler(async (context) => {
  const { request } = context;

  // Auth: optional — record userId if authenticated, allow anonymous shares
  let userId: number | undefined;
  try {
    const user = await getUserFromRequest(request);
    if (user) {
      userId = user.id;
    }
  } catch {
    // Anonymous request — proceed without userId
  }

  // Parse request body
  let body: {
    entityType: string;
    entityId: number;
    slug: string;
    platform: string;
    generateShortUrl?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return createErrorResponse(BizError.badRequest('Invalid JSON body'), 400);
  }

  const { entityType, entityId, slug, platform, generateShortUrl = false } = body;

  // Validate required fields
  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
    return createErrorResponse(
      BizError.badRequest(`Invalid entityType. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`),
      400
    );
  }

  if (!slug || typeof slug !== 'string') {
    return createErrorResponse(BizError.badRequest('slug is required'), 400);
  }

  if (!platform || typeof platform !== 'string') {
    return createErrorResponse(BizError.badRequest('platform is required'), 400);
  }

  const service = getSocialShareService();

  if (generateShortUrl && entityId) {
    const { shareUrl, shortUrl } = await service.generateShortShareUrl({
      entityType: entityType as EntityType,
      entityId: Number(entityId),
      slug,
      platform,
    });

    const utmParams = {
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: `${entityType}_share`,
      utm_content: slug,
    };

    return createSuccessResponse({ shareUrl, shortUrl, utmParams, userId }, 200);
  }

  // Build UTM-tagged URL without short code
  const shareUrl = service.buildShareUrl({
    entityType: entityType as EntityType,
    slug,
    platform,
  });

  const utmParams = {
    utm_source: platform,
    utm_medium: 'social',
    utm_campaign: `${entityType}_share`,
    utm_content: slug,
  };

  return createSuccessResponse({ shareUrl, utmParams, userId }, 200);
});
