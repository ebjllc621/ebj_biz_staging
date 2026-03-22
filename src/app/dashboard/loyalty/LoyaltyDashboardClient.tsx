/**
 * LoyaltyDashboardClient - Client Component for User Loyalty Overview
 *
 * Displays user's loyalty status, tier progress, and rewards across businesses.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Star,
  TrendingUp,
  Gift,
  Award,
  ArrowRight,
  Loader2,
  Building2,
  Calendar,
  Target,
} from 'lucide-react';
import type { UserLoyalty, LoyaltyTier } from '@features/offers/types';

interface LoyaltyOverview {
  totalBusinesses: number;
  totalClaims: number;
  totalRedemptions: number;
  totalSavings: number;
  topTier: LoyaltyTier;
  loyaltyRecords: (UserLoyalty & {
    listing_name: string;
    listing_slug: string;
    listing_logo: string | null;
  })[];
}

const TIER_COLORS: Record<LoyaltyTier, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  bronze: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  silver: { bg: 'bg-gray-200', text: 'text-gray-700', border: 'border-gray-400' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' },
  platinum: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400' },
};

const TIER_THRESHOLDS = {
  bronze: 3,
  silver: 10,
  gold: 25,
  platinum: 50,
};

export function LoyaltyDashboardClient() {
  const [overview, setOverview] = useState<LoyaltyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoyaltyOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/loyalty', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loyalty data');
      }

      const data = await response.json();
      setOverview(data.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoyaltyOverview();
  }, [fetchLoyaltyOverview]);

  const getTierLabel = (tier: LoyaltyTier): string => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getProgressToNextTier = (claims: number): { nextTier: LoyaltyTier | null; progress: number; remaining: number } => {
    if (claims >= TIER_THRESHOLDS.platinum) {
      return { nextTier: null, progress: 100, remaining: 0 };
    }
    if (claims >= TIER_THRESHOLDS.gold) {
      const remaining = TIER_THRESHOLDS.platinum - claims;
      const range = TIER_THRESHOLDS.platinum - TIER_THRESHOLDS.gold;
      const progress = ((claims - TIER_THRESHOLDS.gold) / range) * 100;
      return { nextTier: 'platinum', progress, remaining };
    }
    if (claims >= TIER_THRESHOLDS.silver) {
      const remaining = TIER_THRESHOLDS.gold - claims;
      const range = TIER_THRESHOLDS.gold - TIER_THRESHOLDS.silver;
      const progress = ((claims - TIER_THRESHOLDS.silver) / range) * 100;
      return { nextTier: 'gold', progress, remaining };
    }
    if (claims >= TIER_THRESHOLDS.bronze) {
      const remaining = TIER_THRESHOLDS.silver - claims;
      const range = TIER_THRESHOLDS.silver - TIER_THRESHOLDS.bronze;
      const progress = ((claims - TIER_THRESHOLDS.bronze) / range) * 100;
      return { nextTier: 'silver', progress, remaining };
    }
    const remaining = TIER_THRESHOLDS.bronze - claims;
    const progress = (claims / TIER_THRESHOLDS.bronze) * 100;
    return { nextTier: 'bronze', progress, remaining };
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return 'Never';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading your rewards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchLoyaltyOverview}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-8 text-center">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">No Rewards Yet</h2>
        <p className="text-gray-500 mb-6">
          Start claiming offers from local businesses to earn loyalty rewards!
        </p>
        <Link
          href="/offers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          Browse Offers
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-purple-600" />
          My Rewards
        </h1>
        <p className="text-gray-600 mt-2">
          Track your loyalty status and rewards across your favorite businesses.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500">Businesses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.totalBusinesses}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">Total Claims</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.totalClaims}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-500">Redemptions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overview.totalRedemptions}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">Total Savings</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">${overview.totalSavings.toFixed(0)}</p>
        </div>
      </div>

      {/* Top Tier Badge */}
      {overview.topTier !== 'new' && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Your Highest Tier</p>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Award className="w-8 h-8" />
                {getTierLabel(overview.topTier)} Member
              </h2>
            </div>
            <div className="text-right">
              <p className="text-purple-100 text-sm">At {overview.loyaltyRecords.filter(r => r.loyalty_tier === overview.topTier).length} businesses</p>
            </div>
          </div>
        </div>
      )}

      {/* Business Loyalty Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Loyalty by Business</h2>

        {overview.loyaltyRecords.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <p className="text-gray-500">No loyalty records yet. Start claiming offers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.loyaltyRecords.map((record) => {
              const tierColors = TIER_COLORS[record.loyalty_tier];
              const progress = getProgressToNextTier(record.total_claims);

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Business Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {record.listing_logo ? (
                          <img
                            src={record.listing_logo}
                            alt={record.listing_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {record.listing_name}
                        </h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierColors.bg} ${tierColors.text}`}>
                          <Star className="w-3 h-3" />
                          {getTierLabel(record.loyalty_tier)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-4 grid grid-cols-3 gap-2 text-center border-b border-gray-100">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{record.total_claims}</p>
                      <p className="text-xs text-gray-500">Claims</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{record.total_redemptions}</p>
                      <p className="text-xs text-gray-500">Redeemed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">${record.total_value.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">Saved</p>
                    </div>
                  </div>

                  {/* Progress to Next Tier */}
                  {progress.nextTier && (
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Next: {getTierLabel(progress.nextTier)}
                        </span>
                        <span className="text-gray-500">{progress.remaining} more claims</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${TIER_COLORS[progress.nextTier].bg.replace('100', '500')}`}
                          style={{ width: `${Math.min(progress.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Last Claim */}
                  <div className="px-4 pb-4 text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last claim: {formatDate(record.last_claim_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to earn more rewards?</h3>
        <p className="text-gray-600 mb-4">
          Browse our latest offers and keep building your loyalty status!
        </p>
        <Link
          href="/offers"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
        >
          Browse Offers
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
