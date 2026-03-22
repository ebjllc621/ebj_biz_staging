/**
 * BusinessSharePerformanceCard - Aggregate share performance across all offers
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 *
 * Displays aggregate share performance metrics for all offers from a business
 */
'use client';

import React from 'react';
import { Share2, TrendingUp, MousePointerClick, Trophy, Lightbulb, RefreshCw, AlertCircle } from 'lucide-react';
import { useBusinessSharePerformance } from '@features/offers/hooks/useBusinessSharePerformance';
import type { SharePlatform } from '@features/offers/types';

interface BusinessSharePerformanceCardProps {
  listingId: number;
}

const PLATFORM_COLORS: Record<SharePlatform, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  email: '#6B7280',
  copy_link: '#ed6437',
  whatsapp: '#25D366',
  sms: '#9333EA',
  instagram: '#E4405F',
  nextdoor: '#00B246'
};

function formatPlatformName(platform: string): string {
  return platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function BusinessSharePerformanceCard({ listingId }: BusinessSharePerformanceCardProps) {
  const { performance, isLoading, error, refresh } = useBusinessSharePerformance(listingId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Offers Share Performance</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Offers Share Performance</h3>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={refresh}
            className="text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!performance || performance.total_shares === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Offers Share Performance</h3>
        <div className="text-center py-8 text-gray-500">
          <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No share data yet across your offers.</p>
          <p className="text-sm mt-1">Share your offers on social media to start tracking performance.</p>
        </div>
      </div>
    );
  }

  // Get top platforms by clicks
  const topPlatforms = Object.entries(performance.platform_breakdown)
    .filter(([, data]) => data.shares > 0)
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 3);

  // Recommendation based on best platform
  const getRecommendation = () => {
    const firstPlatform = topPlatforms[0];
    if (!firstPlatform) return null;
    const [bestPlatform, bestData] = firstPlatform;
    const clickRate = bestData.shares > 0 ? (bestData.clicks / bestData.shares) * 100 : 0;

    if (clickRate > 5) {
      return `${formatPlatformName(bestPlatform)} is performing well with a ${clickRate.toFixed(1)}% click rate. Consider sharing more offers there.`;
    } else if (clickRate > 0) {
      return `Try adding engaging descriptions when sharing on ${formatPlatformName(bestPlatform)} to improve click-through rates.`;
    }
    return `Share more consistently on ${formatPlatformName(bestPlatform)} to build an engaged audience.`;
  };

  const recommendation = getRecommendation();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">All Offers Share Performance</h3>
        <button
          onClick={refresh}
          className="text-gray-500 hover:text-gray-700"
          title="Refresh analytics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Total Shares</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{performance.total_shares}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-sm font-medium">Total Clicks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{performance.total_clicks}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Avg CTR</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {performance.avg_click_through_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Best Performing Offer */}
      {performance.best_performing_offer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Best Performing Offer</h4>
              <p className="text-sm text-yellow-700 mt-1">
                {performance.best_performing_offer.title}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {performance.best_performing_offer.clicks} clicks from shares
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Platforms */}
      {topPlatforms.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Top Platforms</h4>
          <div className="space-y-2">
            {topPlatforms.map(([platform, data]) => {
              const clickRate = data.shares > 0 ? (data.clicks / data.shares) * 100 : 0;
              return (
                <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS[platform as SharePlatform] || '#6B7280' }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {formatPlatformName(platform)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {data.shares} shares · {data.clicks} clicks ·
                    <span className="font-medium ml-1">{clickRate.toFixed(1)}% CTR</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800">Recommendation</h4>
              <p className="text-sm text-blue-700 mt-1">{recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessSharePerformanceCard;
