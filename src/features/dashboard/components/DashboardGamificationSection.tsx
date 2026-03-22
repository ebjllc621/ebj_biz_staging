/**
 * DashboardGamificationSection - Gamification cards for dashboard
 *
 * Layout:
 * - Row 1: Your Recommendation Impact (full width with metrics left, feedback right)
 * - Row 2: Your Tier | Recommendation Streak (side-by-side like leaderboard page)
 *
 * @tier STANDARD
 * @phase Dashboard Gamification Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Loader2,
  ChevronRight,
  Zap,
  Crown,
  Medal,
  Award
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SenderImpactCard } from '@features/sharing/components/SenderImpactCard';
import type { TierStatus, StreakStatus, Tier } from '@features/contacts/types/reward';

interface GamificationData {
  tier: TierStatus | null;
  streak: StreakStatus | null;
}

// Tier color mapping
const tierColors: Record<Tier, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', icon: Medal },
  silver: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300', icon: Medal },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', icon: Crown },
  platinum: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400', icon: Award }
};

function DashboardGamificationContent() {
  const [data, setData] = useState<GamificationData>({
    tier: null,
    streak: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tier and streak data (SenderImpactCard handles its own fetch)
      const streakResponse = await fetch('/api/contacts/rewards/streak', { credentials: 'include' });

      if (!streakResponse.ok) {
        throw new Error('Failed to fetch gamification data');
      }

      const streakData = await streakResponse.json();

      setData({
        tier: streakData.data?.tier || null,
        streak: streakData.data?.streak || null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gamification data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { tier, streak } = data;
  const TierIcon = tier ? tierColors[tier.currentTier].icon : Trophy;

  // Loading state - show skeletons for tier/streak cards only (SenderImpactCard has its own loading)
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Row 1: SenderImpactCard (handles its own loading) */}
        <SenderImpactCard />

        {/* Row 2: Tier + Streak loading skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-24 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    // Silently fail for tier/streak - still show SenderImpactCard
    return <SenderImpactCard />;
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Your Recommendation Impact (full width) */}
      <SenderImpactCard />

      {/* Row 2: Your Tier + Recommendation Streak (side-by-side like leaderboard) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Your Tier */}
        <Link
          href="/dashboard/recommendations/progress"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {tier && (
                <div className={`p-2 rounded-lg ${tierColors[tier.currentTier].bg}`}>
                  <TierIcon className={`w-5 h-5 ${tierColors[tier.currentTier].text}`} />
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-600">Your Tier</h3>
                <p className={`text-lg font-bold ${tier ? tierColors[tier.currentTier].text : 'text-gray-900'}`}>
                  {tier?.tierInfo?.name || 'Bronze'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>

          {tier && tier.nextTier && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress to {tier.nextTierInfo?.name}</span>
                <span>{tier.progressPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${tier.progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {tier.pointsToNextTier?.toLocaleString()} pts to go
              </p>
            </div>
          )}

          {tier && !tier.nextTier && (
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-purple-700">Maximum Tier!</p>
            </div>
          )}
        </Link>

        {/* Card 2: Recommendation Streak */}
        <Link
          href="/dashboard/recommendations/progress"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${streak && streak.currentStreak > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Flame className={`w-5 h-5 ${streak && streak.currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600">Streak</h3>
                <p className="text-lg font-bold text-gray-900">
                  {streak?.currentStreak || 0} <span className="text-sm font-normal text-gray-500">weeks</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Longest streak</span>
              <span className="font-medium text-gray-700">{streak?.longestStreak || 0} weeks</span>
            </div>

            {streak?.nextStreakBonus && (
              <div className="flex items-center gap-1 text-xs bg-orange-50 rounded-lg px-2 py-1">
                <Zap className="w-3 h-3 text-orange-500" />
                <span className="text-orange-700">
                  {streak.nextStreakBonus.weeks - (streak.currentStreak || 0)} more weeks for {streak.nextStreakBonus.multiplier}x bonus
                </span>
              </div>
            )}

            {streak?.bonusMultiplier && streak.bonusMultiplier > 1 && (
              <div className="bg-green-50 rounded-lg px-2 py-1 text-center">
                <span className="text-xs font-medium text-green-700">
                  Active Bonus: {streak.bonusMultiplier}x points
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

export function DashboardGamificationSection() {
  return (
    <ErrorBoundary componentName="DashboardGamificationSection">
      <DashboardGamificationContent />
    </ErrorBoundary>
  );
}

export default DashboardGamificationSection;
