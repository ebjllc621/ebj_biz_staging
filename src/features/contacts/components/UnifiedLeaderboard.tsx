/**
 * UnifiedLeaderboard - Combined referral + recommendation leaderboard
 *
 * @tier STANDARD
 * @phase Unified Leaderboard - Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Features:
 * - Unified ranking (referrals + recommendations)
 * - Period filtering (all-time, month, week)
 * - Category filtering (all, listing, event, user, offer)
 * - Shows both referral and recommendation counts
 * - Current user highlighting
 * - Mobile responsive
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Trophy, Medal, Loader2, Crown, Star, BadgeCheck, UserPlus } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getAvatarInitials } from '@core/utils/avatar';
import type { LeaderboardEntry, LeaderboardFilters } from '../types/reward';

interface UnifiedLeaderboardProps {
  initialData?: LeaderboardEntry[];
  showFilters?: boolean;
  showCategoryFilter?: boolean;
  className?: string;
}

type Period = 'all_time' | 'this_month' | 'this_week';
// Phase 8: Extended with content types + Jobs Integration
type Category = 'all' | 'listing' | 'event' | 'user' | 'offer' | 'job' | 'referral' | 'article' | 'newsletter' | 'podcast' | 'video';

const periodLabels: Record<Period, string> = {
  all_time: 'All Time',
  this_month: 'This Month',
  this_week: 'This Week'
};

// Phase 1 entity categories + Jobs
const entityCategoryLabels: Record<string, string> = {
  all: 'All',
  listing: 'Listings',
  event: 'Events',
  user: 'Users',
  offer: 'Offers',
  job: 'Jobs',
  referral: 'Referrals'
};

// Phase 8 content categories
const contentCategoryLabels: Record<string, string> = {
  article: 'Articles',
  newsletter: 'Newsletters',
  podcast: 'Podcasts',
  video: 'Videos'
};

const rankIcons: Record<number, { icon: React.ElementType; color: string }> = {
  1: { icon: Crown, color: 'text-yellow-500' },
  2: { icon: Medal, color: 'text-gray-400' },
  3: { icon: Medal, color: 'text-amber-600' }
};

function UnifiedLeaderboardContent({
  initialData,
  showFilters = true,
  showCategoryFilter = true,
  className = ''
}: UnifiedLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialData || []);
  const [userRank, setUserRank] = useState<number>(0);
  const [period, setPeriod] = useState<Period>('all_time');
  const [category, setCategory] = useState<Category>('all');
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (selectedPeriod: Period, selectedCategory: Category) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/contacts/rewards/leaderboard?period=${selectedPeriod}&category=${selectedCategory}&limit=10`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setEntries(data.data?.leaderboard || []);
      setUserRank(data.data?.user_rank || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchLeaderboard(period, category);
    }
  }, [initialData, period, category, fetchLeaderboard]);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
  }, []);

  const handleCategoryChange = useCallback((newCategory: Category) => {
    setCategory(newCategory);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => fetchLeaderboard(period, category)}
          className="mt-2 text-sm text-[#ed6437] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ed6437]" />
            Sharing Leaderboard
          </h3>

          {/* Period Filter */}
          {showFilters && (
            <div className="flex gap-1">
              {(Object.keys(periodLabels) as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`
                    px-3 py-1 text-xs rounded-full transition-colors
                    ${period === p
                      ? 'bg-[#022641] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter (Phase 6 + Phase 8) */}
        {showCategoryFilter && (
          <div className="space-y-2 mt-3">
            {/* Entity categories (Phase 1) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(Object.keys(entityCategoryLabels) as Category[]).map(c => (
                <button
                  key={c}
                  onClick={() => handleCategoryChange(c)}
                  className={`
                    px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                    ${category === c
                      ? 'bg-[#ed6437] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  {entityCategoryLabels[c]}
                </button>
              ))}
            </div>
            {/* Content categories (Phase 8) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-gray-400 self-center mr-1">Content:</span>
              {(Object.keys(contentCategoryLabels) as Category[]).map(c => (
                <button
                  key={c}
                  onClick={() => handleCategoryChange(c)}
                  className={`
                    px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                    ${category === c
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  {contentCategoryLabels[c]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-100">
        {entries.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <Star className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No sharers yet. Be the first!</p>
          </div>
        ) : (
          entries.map(entry => {
            const RankIcon = rankIcons[entry.rank]?.icon;
            const rankColor = rankIcons[entry.rank]?.color;

            return (
              <div
                key={entry.user_id}
                className={`
                  px-6 py-4 flex items-center gap-4
                  ${entry.is_current_user ? 'bg-blue-50' : ''}
                `}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {RankIcon ? (
                    <RankIcon className={`w-6 h-6 mx-auto ${rankColor}`} />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#022641] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.user_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getAvatarInitials(entry.user_name)
                  )}
                </div>

                {/* Name & Stats */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${entry.is_current_user ? 'text-blue-700' : 'text-gray-900'}`}>
                    {entry.user_name}
                    {entry.is_current_user && (
                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <UserPlus className="w-3 h-3" />
                      {entry.total_referrals} refs
                    </span>
                    <span className="flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      {entry.total_recommendations} recs
                    </span>
                    <span>{entry.badges_earned} badges</span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-[#ed6437]">{entry.total_points.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current User Rank (if not in top 10) */}
      {userRank > 10 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-600">
          Your rank: <strong className="text-[#022641]">#{userRank}</strong>
        </div>
      )}
    </div>
  );
}

export function UnifiedLeaderboard(props: UnifiedLeaderboardProps) {
  return (
    <ErrorBoundary componentName="UnifiedLeaderboard">
      <UnifiedLeaderboardContent {...props} />
    </ErrorBoundary>
  );
}

export default UnifiedLeaderboard;
