import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getRecommendationService } from '@core/services/ServiceRegistry';
import { RecommendationOptions } from '@features/connections/types';
import { BizError } from '@core/errors/BizError';
import { NextResponse } from 'next/server';

/**
 * GET /api/users/connections/recommendations
 *
 * Get connection recommendations for the authenticated user
 *
 * Query params:
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 * - minScore: number (default: user's saved preference, or 0 if none)
 * - industry: string (optional)
 * - location: string (optional)
 * - compact: boolean (default: false) - Return mobile-optimized payload
 *
 * NOTE: If minScore is not provided, the user's saved minScoreThreshold
 * preference from user_recommendation_preferences table will be used.
 *
 * @phase ConnectP2 Phase 2
 * @phase Phase 8E - Added compact payload support for mobile
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const searchParams = context.request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const minScoreParam = searchParams.get('minScore');
  // Only parse minScore if explicitly provided - otherwise let service use user preferences
  const minScore = minScoreParam !== null ? parseFloat(minScoreParam) : undefined;
  const industry = searchParams.get('industry') || undefined;
  const location = searchParams.get('location') || undefined;
  const compact = searchParams.get('compact') === 'true'; // Phase 8E: mobile optimization

  // Validate parameters
  if (limit < 1 || limit > 100) {
    throw BizError.badRequest('Limit must be between 1 and 100');
  }

  if (offset < 0) {
    throw BizError.badRequest('Offset must be non-negative');
  }

  if (minScore !== undefined && (minScore < 0 || minScore > 100)) {
    throw BizError.badRequest('Min score must be between 0 and 100');
  }

  const recommendationService = getRecommendationService();

  const options: RecommendationOptions = {
    limit,
    offset,
    ...(minScore !== undefined && { minScore }), // Only include if explicitly provided
    industry,
    location
  };

  const result = await recommendationService.getConnectionRecommendations(
    userId,
    options
  );

  // Phase 8E: Return compact payload for mobile if requested
  if (compact) {
    const mobileRecommendations = result.recommendations.map(rec => ({
      userId: rec.userId,
      username: rec.username,
      displayName: rec.displayName,
      avatarUrl: rec.avatarUrl,
      avatarBgColor: rec.avatarBgColor,
      score: rec.score,
      headline: rec.headline,
      mutualConnectionCount: rec.mutualConnectionCount,
      primaryReason: rec.reasons?.[0] || null
    }));

    const responseData = {
      success: true,
      data: {
        recommendations: mobileRecommendations,
        total: result.total,
        offset,
        limit
      },
      meta: {
        requestId: context.requestId,
        timestamp: new Date(),
        version: '1.0'
      }
    };

    // Return NextResponse with cache headers for mobile
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=300',
        'ETag': `"${Date.now()}"`
      }
    });
  }

  return createSuccessResponse(result, context.requestId);
}, {
  requireAuth: true
});
