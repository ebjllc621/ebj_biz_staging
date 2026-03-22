/**
 * ReferralAnalytics - Referral statistics analytics section
 *
 * Displays Phase 3-4 referral and reward metrics in the analytics dashboard.
 *
 * @tier SIMPLE
 * @phase Contacts Enhancement Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority MASTER_BRAIN_PLAN_INDEX.md
 * @reference src/features/contacts/services/ReferralService.ts - getStats()
 * @reference src/features/contacts/services/RewardService.ts - getRewardSummary()
 */

'use client';

import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  UserCheck,
  Users,
  Trophy,
  Award,
  Loader2,
  RefreshCw
} from 'lucide-react';
import type { ReferralStats } from '../types/referral';

// ============================================================================
// TYPES
// ============================================================================

interface ReferralAnalyticsProps {
  /** Optional custom fetch function */
  onFetch?: () => Promise<ReferralAnalyticsData>;
}

interface ReferralAnalyticsData {
  referralStats: ReferralStats;
  rewardData: {
    totalPoints: number;
    rank: number;
    badgesEarned: number;
  };
}

// ============================================================================
// HELPER COMPONENT
// ============================================================================

type ColorKey = 'blue' | 'green' | 'orange' | 'purple' | 'yellow';

function MetricCard({
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
  color?: ColorKey;
}) {
  const colorClasses: Record<ColorKey, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600' }
  };

  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-lg p-4`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-6 h-6 ${colors.icon}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ReferralAnalytics = memo(function ReferralAnalytics({
  onFetch
}: ReferralAnalyticsProps) {
  const [data, setData] = useState<ReferralAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (onFetch) {
        const result = await onFetch();
        setData(result);
      } else {
        // Fetch referral stats and reward summary in parallel
        const [referralsRes, rewardsRes] = await Promise.all([
          fetch('/api/contacts/referrals?stats=true', { credentials: 'include' }),
          fetch('/api/contacts/rewards', { credentials: 'include' })
        ]);

        if (!referralsRes.ok || !rewardsRes.ok) {
          throw new Error('Failed to fetch referral analytics');
        }

        const referralsJson = await referralsRes.json();
        const rewardsJson = await rewardsRes.json();

        // Extract from envelope pattern
        const referralStats = referralsJson.data?.stats || referralsJson.stats || {
          total_sent: 0,
          total_registered: 0,
          total_connected: 0,
          pending_referrals: 0,
          conversion_rate: 0,
          total_points_earned: 0
        };

        const rewardData = rewardsJson.data || rewardsJson;

        setData({
          referralStats,
          rewardData: {
            totalPoints: rewardData.totalPoints || 0,
            rank: rewardData.rank || 0,
            badgesEarned: rewardData.badges?.length || 0
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [onFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center py-4">
          <p className="text-sm text-red-600 mb-2">{error || 'Failed to load'}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { referralStats, rewardData } = data;
  const conversionRate = referralStats.conversion_rate?.toFixed(1) || '0';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Referral Performance</h3>
        <button
          onClick={fetchData}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={UserPlus}
          label="Referrals Sent"
          value={referralStats.total_sent || 0}
          subtext={`${referralStats.pending_referrals || 0} pending`}
          color="blue"
        />
        <MetricCard
          icon={UserCheck}
          label="Registered"
          value={referralStats.total_registered || 0}
          subtext={`${conversionRate}% conversion`}
          color="green"
        />
        <MetricCard
          icon={Users}
          label="Connected"
          value={referralStats.total_connected || 0}
          color="purple"
        />
        <MetricCard
          icon={Trophy}
          label="Points Earned"
          value={rewardData.totalPoints}
          subtext={`Rank #${rewardData.rank}`}
          color="yellow"
        />
      </div>

      {/* Conversion Funnel (visual) */}
      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Conversion Funnel</h4>
        <div className="space-y-2">
          {/* Sent */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Sent</span>
              <span className="font-medium">{referralStats.total_sent || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-blue-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Registered */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Registered</span>
              <span className="font-medium">{referralStats.total_registered || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500"
                style={{
                  width: `${referralStats.total_sent > 0
                    ? Math.round((referralStats.total_registered / referralStats.total_sent) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>

          {/* Connected */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Connected</span>
              <span className="font-medium">{referralStats.total_connected || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-purple-500"
                style={{
                  width: `${referralStats.total_sent > 0
                    ? Math.round((referralStats.total_connected / referralStats.total_sent) * 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges Earned */}
      {rewardData.badgesEarned > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <Award className="w-5 h-5 text-yellow-500" />
          <span className="text-sm text-gray-700">
            {rewardData.badgesEarned} badge{rewardData.badgesEarned !== 1 ? 's' : ''} earned
          </span>
        </div>
      )}
    </div>
  );
});

export default ReferralAnalytics;
