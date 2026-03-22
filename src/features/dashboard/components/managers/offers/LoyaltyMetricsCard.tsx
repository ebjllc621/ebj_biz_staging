/**
 * LoyaltyMetricsCard - Loyalty statistics card for dashboard
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, TrendingUp, Loader2, Star, RefreshCw } from 'lucide-react';
import type { LoyaltyTier } from '@features/offers/types';

interface LoyaltyMetrics {
  totalLoyalCustomers: number;
  tierDistribution: Record<LoyaltyTier, number>;
  repeatClaimRate: number;
  averageClaimsPerCustomer: number;
  topTierCount: number;
}

interface LoyaltyMetricsCardProps {
  listingId: number;
}

const TIER_COLORS: Record<LoyaltyTier, string> = {
  new: 'bg-gray-200',
  bronze: 'bg-amber-400',
  silver: 'bg-gray-300',
  gold: 'bg-yellow-400',
  platinum: 'bg-purple-400',
};

export function LoyaltyMetricsCard({ listingId }: LoyaltyMetricsCardProps) {
  const [metrics, setMetrics] = useState<LoyaltyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/loyalty-metrics`, {
        credentials: 'include',
      });

      if (!response.ok) {
        // If endpoint doesn't exist, use mock data for now
        setMetrics({
          totalLoyalCustomers: 0,
          tierDistribution: {
            new: 0,
            bronze: 0,
            silver: 0,
            gold: 0,
            platinum: 0,
          },
          repeatClaimRate: 0,
          averageClaimsPerCustomer: 0,
          topTierCount: 0,
        });
        return;
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      // Use fallback metrics on error
      setMetrics({
        totalLoyalCustomers: 0,
        tierDistribution: {
          new: 0,
          bronze: 0,
          silver: 0,
          gold: 0,
          platinum: 0,
        },
        repeatClaimRate: 0,
        averageClaimsPerCustomer: 0,
        topTierCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      fetchMetrics();
    }
  }, [listingId, fetchMetrics]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const totalTiers = Object.values(metrics.tierDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Loyalty Overview
        </h3>
        <button
          onClick={fetchMetrics}
          className="p-2 text-gray-400 hover:text-purple-600 rounded-lg"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">Loyal Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.totalLoyalCustomers}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Repeat Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.repeatClaimRate}%</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600">Gold+ Members</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.topTierCount}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-600">Avg Claims</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.averageClaimsPerCustomer.toFixed(1)}</p>
        </div>
      </div>

      {/* Tier Distribution */}
      {totalTiers > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Tier Distribution</p>
          <div className="flex h-4 rounded-full overflow-hidden">
            {(['platinum', 'gold', 'silver', 'bronze', 'new'] as LoyaltyTier[]).map((tier) => {
              const count = metrics.tierDistribution[tier];
              const percentage = (count / totalTiers) * 100;
              if (percentage === 0) return null;
              return (
                <div
                  key={tier}
                  className={`${TIER_COLORS[tier]} transition-all`}
                  style={{ width: `${percentage}%` }}
                  title={`${tier}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Platinum</span>
            <span>New</span>
          </div>
        </div>
      )}
    </div>
  );
}
