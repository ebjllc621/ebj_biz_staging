/**
 * Leaderboard API Route
 * GET /api/contacts/rewards/leaderboard - Get unified leaderboard
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { RewardService } from '@features/contacts/services/RewardService';
import { getDatabaseService } from '@core/services/DatabaseService';
import type { LeaderboardFilters } from '@features/contacts/types/reward';

/**
 * GET /api/contacts/rewards/leaderboard
 * Get unified leaderboard (referrals + recommendations)
 *
 * Query Parameters:
 * - period: 'all_time' | 'this_month' | 'this_week'
 * - limit: number (default 10)
 * - category: Phase 6 entities: 'all' | 'listing' | 'event' | 'user' | 'offer'
 *             Phase 8 content: 'article' | 'newsletter' | 'podcast' | 'video'
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new RewardService(db);
  const userId = parseInt(context.userId!, 10);

  // Parse query parameters
  const url = new URL(context.request.url);
  const period = url.searchParams.get('period') as LeaderboardFilters['period'];
  const limitStr = url.searchParams.get('limit');
  const category = url.searchParams.get('category') as LeaderboardFilters['category'];
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  const filters: LeaderboardFilters = {
    period: period || 'all_time',
    limit: Math.min(limit, 100), // Cap at 100
    category: category || 'all' // Phase 6: Category filter
  };

  // Phase 6: Use unified leaderboard method
  const leaderboard = await service.getUnifiedLeaderboard(userId, filters);
  const userRank = await service.getUnifiedUserRank(userId);

  return createSuccessResponse({
    leaderboard,
    user_rank: userRank,
    filters: {
      period: filters.period,
      category: filters.category
    }
  }, context.requestId);
}, {
  requireAuth: true
});
