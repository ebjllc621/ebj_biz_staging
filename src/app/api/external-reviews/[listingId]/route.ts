/**
 * External Reviews Fetch API Route
 *
 * GET /api/external-reviews/[listingId] - Fetch all external reviews for a listing (public)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - Response format: createSuccessResponse/createErrorResponse
 * - Public access (no auth required — display-only feed)
 * - Review text returned in-memory, NEVER stored persistently
 * - External review data NEVER enters the native reviews table
 *
 * @authority CLAUDE.md - API Standards
 * @authority docs/reviews/bizconekt_google_reviews_compliance_report.md
 * @phase Phase 6A - Task 6.3: External Reviews API Routes
 */

import { apiHandler } from '@core/api/apiHandler';
import { createSuccessResponse, createErrorResponse } from '@core/api/responseHelpers';
import { getDatabaseService } from '@core/services/DatabaseService';
import { ExternalReviewAdapterService } from '@core/services/ExternalReviewAdapterService';

/**
 * GET /api/external-reviews/[listingId]
 * Public endpoint — returns all connected external review providers and their reviews.
 * Reviews are returned from in-memory cache (4-hour TTL) per Google TOS.
 */
export const GET = apiHandler(async (context) => {
  const { request } = context;

  // Extract listingId from URL path: .../external-reviews/[listingId]
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const rawId = pathParts[pathParts.length - 1];

  if (!rawId) {
    return createErrorResponse('Listing ID is required', 400);
  }

  const listingId = parseInt(rawId, 10);
  if (isNaN(listingId) || listingId <= 0) {
    return createErrorResponse('Invalid listing ID', 400);
  }

  const db = getDatabaseService();

  // Check if external reviews feature is enabled
  const settingResult = await db.query<{ setting_value: string }>(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'feature_external_reviews_enabled' LIMIT 1"
  );
  const isEnabled = settingResult.rows?.[0]?.setting_value === 'true';
  if (!isEnabled) {
    return createSuccessResponse({ providers: [] });
  }

  const service = new ExternalReviewAdapterService(db);

  // Get all connected providers for this listing
  const connectedProviders = await service.getConnectedProviders(listingId);

  if (!connectedProviders.length) {
    return createSuccessResponse({ providers: [] });
  }

  // Fetch reviews for each connected provider (cache-aware)
  const providerResults = await Promise.all(
    connectedProviders.map(async (providerSource) => {
      try {
        const { source, reviews } = await service.getExternalReviews(
          listingId,
          providerSource.provider
        );
        return { provider: providerSource.provider, source, reviews };
      } catch (err) {
        console.error(
          `[external-reviews] Failed to fetch reviews for provider ${providerSource.provider}:`,
          err
        );
        // Return provider with empty reviews rather than failing the whole request
        return { provider: providerSource.provider, source: providerSource, reviews: [] };
      }
    })
  );

  return createSuccessResponse({ providers: providerResults });
}, {
  allowedMethods: ['GET']
});
