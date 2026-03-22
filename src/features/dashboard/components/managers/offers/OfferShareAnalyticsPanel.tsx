/**
 * OfferShareAnalyticsPanel - Share performance analytics for a single offer
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Offers Phase 2 - Engagement & Notifications
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_2_ENGAGEMENT_BRAIN_PLAN.md
 *
 * Displays share counts and click-through rates by social platform for an offer
 */
'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Share2, TrendingUp, MousePointerClick, Award, RefreshCw } from 'lucide-react';
import { useOfferShareAnalytics } from '@features/offers/hooks/useOfferShareAnalytics';
import type { SharePlatform } from '@features/offers/types';

interface OfferShareAnalyticsPanelProps {
  offerId: number;
  offerTitle?: string;
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

export function OfferShareAnalyticsPanel({ offerId, offerTitle }: OfferShareAnalyticsPanelProps) {
  const { analytics, isLoading, error, refresh } = useOfferShareAnalytics(offerId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Performance</h3>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Performance</h3>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
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

  if (!analytics || analytics.total_shares === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Performance</h3>
        <div className="text-center py-8 text-gray-500">
          <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No shares yet.</p>
          <p className="text-sm mt-1">Share this offer on social media to track performance.</p>
        </div>
      </div>
    );
  }

  // Convert platform data to chart format
  const chartData = Object.entries(analytics.shares_by_platform)
    .filter(([, shares]) => shares > 0)
    .map(([platform, shares]) => ({
      platform: platform as SharePlatform,
      shares,
      clicks: analytics.clicks_by_platform[platform as SharePlatform] || 0,
      clickRate: shares > 0
        ? ((analytics.clicks_by_platform[platform as SharePlatform] || 0) / shares) * 100
        : 0
    }))
    .sort((a, b) => b.shares - a.shares);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Share Performance</h3>
          {offerTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{offerTitle}</p>
          )}
        </div>
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
          <p className="text-2xl font-bold text-gray-900">{analytics.total_shares}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <MousePointerClick className="w-4 h-4" />
            <span className="text-sm font-medium">Total Clicks</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{analytics.total_clicks}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Click Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.click_through_rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Top Platform */}
      {analytics.top_platform && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Top Platform: {formatPlatformName(analytics.top_platform)}
            </span>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="platform"
                stroke="#6b7280"
                tickFormatter={formatPlatformName}
                fontSize={12}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const entry = chartData.find(d => d.platform === label);
                  if (!entry) return null;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900">{formatPlatformName(String(label))}</p>
                      <p className="text-sm text-gray-600">Shares: {entry.shares}</p>
                      <p className="text-sm text-gray-600">Clicks: {entry.clicks}</p>
                      <p className="text-sm font-medium text-gray-700">CTR: {entry.clickRate.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="shares" name="Shares" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Platform Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Platform Breakdown</h4>
        {chartData.map(item => (
          <div key={item.platform} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
              />
              <span className="text-sm font-medium text-gray-700">
                {formatPlatformName(item.platform)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {item.shares} shares · {item.clicks} clicks ·
              <span className="font-medium ml-1">{item.clickRate.toFixed(1)}% CTR</span>
            </div>
          </div>
        ))}
      </div>

      {/* Conversions */}
      {(analytics.conversions.signups > 0 || analytics.conversions.claims > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Conversions from Shares</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-600">Sign-ups</p>
              <p className="text-xl font-bold text-gray-900">{analytics.conversions.signups}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-600">Claims</p>
              <p className="text-xl font-bold text-gray-900">{analytics.conversions.claims}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OfferShareAnalyticsPanel;
