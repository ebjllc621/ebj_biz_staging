/**
 * Dashboard Recommendations Leaderboard Page
 *
 * Displays unified leaderboard combining referrals + recommendations
 * with category filtering and user ranking.
 *
 * @authority docs/components/connections/userrecommendations/phases/PHASE_6_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase User Recommendations - Phase 6
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { UnifiedLeaderboard } from '@features/contacts/components/UnifiedLeaderboard';
import { TierProgressCard } from '@features/contacts/components/TierProgressCard';
import { StreakCard } from '@features/contacts/components/StreakCard';
import { Trophy, Loader2 } from 'lucide-react';
import type { TierStatus, StreakStatus } from '@features/contacts/types/reward';

function LeaderboardPageContent() {
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatusData = useCallback(async () => {
    try {
      const response = await fetch('/api/contacts/rewards/streak', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTierStatus(data.data?.tier || null);
        setStreakStatus(data.data?.streak || null);
      }
    } catch (err) {
      console.error('Failed to fetch status data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusData();
  }, [fetchStatusData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">
            See how you rank among top recommenders
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          </>
        ) : (
          <>
            {tierStatus && <TierProgressCard tierStatus={tierStatus} />}
            {streakStatus && <StreakCard streakStatus={streakStatus} onFreezeUsed={fetchStatusData} />}
          </>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <UnifiedLeaderboard showCategoryFilter={true} />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ErrorBoundary componentName="DashboardLeaderboardPage">
      <LeaderboardPageContent />
    </ErrorBoundary>
  );
}
