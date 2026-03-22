/**
 * JobReferralBadge Component
 *
 * Display user's job referral stats with badges and progress
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - Integrates with RewardService gamification
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/contacts/services/RewardService.ts - Rewards pattern
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';

interface ReferralStats {
  total_referrals: number;
  total_applied: number;
  total_hired: number;
  total_points_earned: number;
  badges: string[];
}

interface JobReferralBadgeProps {
  userId: number;
  compact?: boolean;
}

export function JobReferralBadge({ userId, compact = false }: JobReferralBadgeProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/user/referral-stats?userId=${userId}`);
        if (response.ok) {
          const result = await response.json();
          setStats(result.data?.stats || null);
        }
      } catch (error) {
        console.error('Failed to fetch referral stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-md h-20 w-full"></div>
    );
  }

  if (!stats) return null;

  const badgeDefinitions: Record<string, { icon: string; color: string; label: string }> = {
    talent_scout: { icon: '🔍', color: 'bg-blue-100 text-blue-800', label: 'Talent Scout' },
    top_recruiter: { icon: '⭐', color: 'bg-yellow-100 text-yellow-800', label: 'Top Recruiter' },
    hiring_hero: { icon: '🏆', color: 'bg-purple-100 text-purple-800', label: 'Hiring Hero' }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <span className="font-semibold text-gray-700">{stats.total_referrals}</span>
          <span className="text-gray-600">referrals</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-semibold text-primary">{stats.total_points_earned}</span>
          <span className="text-gray-600">points</span>
        </div>
        {stats.badges.length > 0 && (
          <div className="flex items-center space-x-1">
            {stats.badges.slice(0, 2).map((badge, index) => {
              const badgeInfo = badgeDefinitions[badge];
              return badgeInfo ? (
                <span key={index} className="text-lg" title={badgeInfo.label}>
                  {badgeInfo.icon}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Job Referral Stats</h3>
        <Link
          href={"/dashboard/recommendations" as Route}
          className="text-sm text-primary hover:underline"
        >
          View Leaderboard
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total_referrals}</div>
          <div className="text-sm text-gray-600">Referrals Sent</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total_applied}</div>
          <div className="text-sm text-gray-600">Applications</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.total_hired}</div>
          <div className="text-sm text-gray-600">Hired</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{stats.total_points_earned}</div>
          <div className="text-sm text-gray-600">Points Earned</div>
        </div>
      </div>

      {/* Badges */}
      {stats.badges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Earned Badges</h4>
          <div className="flex flex-wrap gap-2">
            {stats.badges.map((badge, index) => {
              const badgeInfo = badgeDefinitions[badge];
              return badgeInfo ? (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeInfo.color}`}
                >
                  <span className="mr-1">{badgeInfo.icon}</span>
                  {badgeInfo.label}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Progress to Next Badge */}
      {stats.total_referrals < 5 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Next Badge: Talent Scout</span>
            <span className="text-sm font-semibold text-gray-900">
              {stats.total_referrals}/5
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(stats.total_referrals / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
