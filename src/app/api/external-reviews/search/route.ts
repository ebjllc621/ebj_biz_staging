/**
 * External Reviews Search API Route
 *
 * GET /api/external-reviews/search?q={query}&location={location}
 * Auth required — prevents unauthenticated Google Places API abuse
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Auth required to prevent API key abuse
 * - API key accessed server-side only — NEVER exposed to client responses
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 6A - Task 6.3: External Reviews API Routes
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getUserFromRequest } from '@core/utils/session-helpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ExternalReviewAdapterService } from '@core/services/ExternalReviewAdapterService';
import type { NextRequest } from 'next/server';

/**
 * GET /api/external-reviews/search
 * Auth required — search external review provider for business candidates.
 * Used during listing setup to locate the business on the selected provider.
 *
 * Query params:
 *   q        (required) — business name / search query
 *   provider (optional) — 'google' | 'yelp' | 'facebook' (default: 'google')
 *   location (optional) — lat,lng or address to bias results (Google + Yelp only)
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Require authentication — prevents unauthenticated API key usage
  const user = await getUserFromRequest(request as NextRequest);
  if (!user) {
    return createErrorResponse('Authentication required', 401);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const location = url.searchParams.get('location') ?? undefined;
  const provider = url.searchParams.get('provider') || 'google';

  if (!query || !query.trim()) {
    return createErrorResponse('Query parameter "q" is required', 400);
  }

  if (query.trim().length < 2) {
    return createErrorResponse('Query must be at least 2 characters', 400);
  }

  const db = getDatabaseService();
  const service = new ExternalReviewAdapterService(db);

  let results;
  switch (provider) {
    case 'google':
      results = await service.searchGooglePlaces(query.trim(), location);
      break;
    case 'yelp':
      results = await service.searchYelpBusinesses(query.trim(), location);
      break;
    case 'facebook':
      results = await service.searchFacebookPages(query.trim());
      break;
    default:
      return createErrorResponse('Invalid provider. Must be google, yelp, or facebook', 400);
  }

  return createSuccessResponse({ results, provider });
}, {
  requireAuth: true,
  allowedMethods: ['GET']
});
