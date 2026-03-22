/**
 * UnifiedGamificationCard - Compact gamification display for recommendations inbox
 *
 * Shows total points, recommendation stats, helpful rate, and leaderboard rank.
 * Supports compact and regular display modes with animated counters.
 *
 * @tier STANDARD
 * @phase Phase 5 - Unified Gamification
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_5_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { UnifiedGamificationCard } from '@features/sharing/components';
 *
 * function InboxSidebar() {
 *   return (
 *     <aside>
 *       <UnifiedGamificationCard mode="compact" />
 *     </aside>
 *   );
 * }
 *
 * // Regular mode for dashboard
 * function DashboardPage() {
 *   return <UnifiedGamificationCard mode="regular" />;
 * }
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, BadgeCheck, ThumbsUp, Heart, TrendingUp, Loader2 } from 'lucide-react';
import type { UnifiedSharingStats } from '@features/contacts/types/reward';

interface UnifiedGamificationCardProps {
  /** Display mode - compact for sidebar, regular for full view */
  mode?: 'compact' | 'regular';
  /** Initial data (optional - will fetch if not provided) */
  initialData?: UnifiedSharingStats;
  /** Callback when data is refreshed */
  onRefresh?: () => void;
}

export function UnifiedGamificationCard({
  mode = 'regular',
  initialData,
  onRefresh
}: UnifiedGamificationCardProps) {
  const [data, setData] = useState<UnifiedSharingStats | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/contacts/rewards/unified', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gamification stats');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error || 'Failed to load stats'}</p>
      </div>
    );
  }

  // Compact mode - minimal display
  if (mode === 'compact') {
    return (
      <div className="bg-gradient-to-r from-[#022641] to-[#033a5c] rounded-lg p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ed6437]" />
            <span className="text-sm font-semibold">Your Impact</span>
          </div>
          <span className="text-2xl font-bold">{data.total_points}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <BadgeCheck className="w-3 h-3 mx-auto mb-1 text-blue-300" />
            <span className="text-gray-300">{data.total_recommendations_sent}</span>
          </div>
          <div className="text-center">
            <ThumbsUp className="w-3 h-3 mx-auto mb-1 text-green-300" />
            <span className="text-gray-300">{data.helpful_rate}%</span>
          </div>
          <div className="text-center">
            <Heart className="w-3 h-3 mx-auto mb-1 text-pink-300" />
            <span className="text-gray-300">{data.total_thank_yous}</span>
          </div>
        </div>
      </div>
    );
  }

  // Regular mode - full display
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ed6437]" />
          Your Gamification Stats
        </h3>
      </div>

      {/* Total Points */}
      <div className="bg-gradient-to-r from-[#022641] to-[#033a5c] rounded-lg p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-300 mb-1">Total Points</p>
            <p className="text-4xl font-bold">{data.total_points.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              From {data.combined_activities} activities
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-[#ed6437]" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <BadgeCheck className="w-5 h-5 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.total_recommendations_sent}</p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <ThumbsUp className="w-5 h-5 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.helpful_rate}%</p>
          <p className="text-xs text-gray-500">Helpful</p>
        </div>
        <div className="text-center p-3 bg-pink-50 rounded-lg">
          <Heart className="w-5 h-5 text-pink-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.total_thank_yous}</p>
          <p className="text-xs text-gray-500">Thanks</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <Trophy className="w-5 h-5 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">{data.recommendation_points}</p>
          <p className="text-xs text-gray-500">Rec Points</p>
        </div>
      </div>

      {/* Helpful Rate Progress */}
      {data.helpful_rate > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Recommendation Quality</span>
            <span className="text-sm font-semibold text-green-600">{data.helpful_rate}% Helpful</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(100, data.helpful_rate)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UnifiedGamificationCard;
