/**
 * Public Leaderboard API Route
 * GET /api/public/leaderboard - Get public leaderboard (no auth required)
 *
 * @tier SIMPLE
 * @phase Homepage Leaderboard Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { LeaderboardFilters } from '@features/contacts/types/reward';

/**
 * GET /api/public/leaderboard
 * Get public leaderboard (no authentication required)
 *
 * Query Parameters:
 * - period: 'all_time' | 'this_month' | 'this_week'
 * - limit: number (default 5 for homepage, max 10)
 *
 * @public No authentication required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);

  // Parse query parameters
  const url = new URL(context.request.url);
  const period = url.searchParams.get('period') as LeaderboardFilters['period'];
  const limitStr = url.searchParams.get('limit');
  const limit = limitStr ? Math.min(parseInt(limitStr, 10), 10) : 5;

  const filters: LeaderboardFilters = {
    period: period || 'all_time',
    limit,
    category: 'all'
  };

  // Get leaderboard without current user context (pass 0 for no highlighting)
  const leaderboard = await service.getUnifiedLeaderboard(0, filters);

  // Return leaderboard entries without user-specific data
  const publicLeaderboard = leaderboard.map(entry => ({
    rank: entry.rank,
    user_name: entry.user_name,
    avatar_url: entry.avatar_url,
    total_points: entry.total_points,
    total_referrals: entry.total_referrals,
    total_recommendations: entry.total_recommendations,
    badges_earned: entry.badges_earned
  }));

  return createSuccessResponse({
    leaderboard: publicLeaderboard,
    filters: {
      period: filters.period
    }
  }, context.requestId);
}, {
  requireAuth: false  // Public endpoint - no authentication required
});
