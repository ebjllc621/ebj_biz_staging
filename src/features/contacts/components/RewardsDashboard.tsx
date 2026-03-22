/**
 * RewardsDashboard - User rewards overview dashboard
 *
 * @tier ADVANCED (ErrorBoundary Required)
 * @phase Contacts Enhancement Phase 4
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/connections/components/ConnectionHealthDashboard.tsx
 *
 * Features:
 * - Points summary with animated counter
 * - Earned badges grid
 * - Next badge progress
 * - Recent rewards feed
 * - Leaderboard position
 * - Mobile responsive
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, UserPlus, Target, Award, Loader2, RefreshCw, BadgeCheck, Eye, ThumbsUp, Heart } from 'lucide-react';
import type { UnifiedRewardSummary } from '../types/reward';
import { BadgeDisplay } from './BadgeDisplay';

interface RewardsDashboardProps {
  initialData?: UnifiedRewardSummary;
  onRefresh?: () => void;
}

/**
 * StatCard subcomponent
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = 'blue'
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * PointsRing - Animated points display
 */
function PointsRing({ points }: { points: number }) {
  const maxPoints = 1000; // For visual scale
  const percentage = Math.min(100, (points / maxPoints) * 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="transform -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#ed6437"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900">{points.toLocaleString()}</span>
        <span className="text-xs text-gray-500">Points</span>
      </div>
    </div>
  );
}

export function RewardsDashboard({
  initialData,
  onRefresh
}: RewardsDashboardProps) {
  const [data, setData] = useState<UnifiedRewardSummary | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/contacts/rewards', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
    onRefresh?.();
  }, [fetchData, onRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Failed to load rewards'}</p>
        <button
          onClick={handleRefresh}
          className="min-h-[44px] px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d5582f]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#ed6437]" />
          Your Rewards
        </h2>
        <button
          onClick={handleRefresh}
          className="min-h-[44px] min-w-[44px] p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Refresh rewards"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Points & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Ring */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center">
          <PointsRing points={data.total_points} />
          <p className="text-sm text-gray-600 mt-4 text-center">
            Rank #{data.leaderboard_rank} on the leaderboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={UserPlus}
            label="Referrals Sent"
            value={data.total_referrals_sent}
            color="blue"
          />
          <StatCard
            icon={Target}
            label="Conversions"
            value={data.total_conversions}
            subtext={data.total_referrals_sent > 0
              ? `${Math.round((data.total_conversions / data.total_referrals_sent) * 100)}% rate`
              : undefined
            }
            color="green"
          />
          <StatCard
            icon={Award}
            label="Badges Earned"
            value={data.badges_earned.length}
            color="purple"
          />
          <StatCard
            icon={Trophy}
            label="Leaderboard"
            value={`#${data.leaderboard_rank}`}
            color="orange"
          />
        </div>
      </div>

      {/* Recommendation Stats Section (Phase 5) */}
      {data.total_recommendations_sent > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-[#ed6437]" />
            Recommendation Impact
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <BadgeCheck className="w-4 h-4 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{data.total_recommendations_sent}</span>
              </div>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">{data.recommendation_points}</span>
              </div>
              <p className="text-xs text-gray-500">Points Earned</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">{data.total_helpful}</span>
              </div>
              <p className="text-xs text-gray-500">Marked Helpful</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-pink-600" />
                <span className="text-2xl font-bold text-gray-900">{data.total_thank_yous}</span>
              </div>
              <p className="text-xs text-gray-500">Thank Yous</p>
            </div>
          </div>
          {data.helpful_rate > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Helpful Rate</span>
                <span className="text-lg font-bold text-green-600">{data.helpful_rate}%</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${data.helpful_rate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Points Breakdown (Phase 5) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Points Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Referral Points</span>
            <span className="text-lg font-semibold text-gray-900">
              {data.total_points - (data.recommendation_points || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">Recommendation Points</span>
            <span className="text-lg font-semibold text-gray-900">
              {data.recommendation_points || 0}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 bg-gray-50 px-3 rounded-lg">
            <span className="text-sm font-semibold text-gray-900">Total Points</span>
            <span className="text-xl font-bold text-[#ed6437]">
              {data.total_points}
            </span>
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      {data.badges_earned.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Your Badges
          </h3>
          <div className="flex flex-wrap gap-4">
            {data.badges_earned.map(badge => (
              <BadgeDisplay
                key={badge.badge_type}
                badge={{
                  id: badge.badge_type,
                  name: badge.badge_name,
                  icon: badge.badge_icon || '🏆',
                  description: badge.badge_description || '',
                  category: badge.badge_category,
                  earned: true,
                  earned_at: badge.earned_at,
                  requirement: { type: '', count: 0 }
                }}
                size="medium"
                showProgress={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Next Badge Progress */}
      {data.next_badge && (
        <div className="bg-gradient-to-r from-[#022641] to-[#033a5c] rounded-lg p-6 text-white">
          <h3 className="font-semibold mb-3">Next Badge: {data.next_badge.name}</h3>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{data.next_badge.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-gray-300 mb-2">{data.next_badge.description}</p>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ed6437] transition-all duration-500"
                  style={{ width: `${data.next_badge.progress?.percentage || 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {data.next_badge.progress?.current || 0} / {data.next_badge.progress?.target || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Rewards */}
      {data.recent_rewards.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <ul className="space-y-3">
            {data.recent_rewards.map(reward => (
              <li key={reward.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    +{reward.points_earned}
                  </div>
                  <span className="text-sm text-gray-700">
                    {reward.description || reward.reward_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(reward.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RewardsDashboard;
