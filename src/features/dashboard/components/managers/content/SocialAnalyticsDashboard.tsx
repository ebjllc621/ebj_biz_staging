'use client';

/**
 * SocialAnalyticsDashboard - Cross-Platform Social Analytics Dashboard
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 9
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_9_POST_ANALYTICS_DASHBOARD.md
 *
 * @reference src/features/dashboard/components/managers/analytics/SocialPerformanceSection.tsx — recharts pattern
 * @reference src/features/dashboard/components/managers/analytics/AnalyticsSummaryCards.tsx — KPI card pattern
 * @reference src/features/dashboard/components/managers/analytics/DateRangeSelector.tsx — date range pattern
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Eye,
  Heart,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
  Share2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useSocialAnalyticsDashboard } from '@features/dashboard/hooks/useSocialAnalyticsDashboard';
import type { SocialPlatform } from '@core/types/social-media';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLATFORM_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
};

type Preset = '7d' | '30d' | '90d' | 'custom';

function formatPlatformName(platform: string): string {
  return platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function SocialAnalyticsDashboardContent() {
  const { selectedListingId } = useListingContext();
  const {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    refetch,
    syncMetrics,
    isSyncing,
  } = useSocialAnalyticsDashboard({ listingId: selectedListingId ?? 0 });

  const [activePreset, setActivePreset] = useState<Preset>('30d');
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset);

    if (preset === 'custom') {
      setShowCustomInputs(true);
      return;
    }

    setShowCustomInputs(false);
    const end = new Date();
    const start = new Date();

    if (preset === '7d') start.setDate(start.getDate() - 7);
    else if (preset === '30d') start.setDate(start.getDate() - 30);
    else if (preset === '90d') start.setDate(start.getDate() - 90);

    const startDate = start.toISOString().split('T')[0]!;
    const endDate = end.toISOString().split('T')[0]!;
    setDateRange(startDate, endDate);
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
        <button
          onClick={() => void refetch()}
          className="ml-auto px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!data || data.summary.totalPosts === 0) {
    return (
      <div className="text-center py-12">
        <Share2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-600 font-medium">No social posts yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Share content to social media to start tracking performance analytics.
        </p>
      </div>
    );
  }

  const presets: { key: Preset; label: string }[] = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '90d', label: 'Last 90 Days' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Social Analytics</h3>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {presets.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetClick(key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activePreset === key
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sync Metrics Button */}
          <button
            onClick={() => void syncMetrics()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#ed6437] hover:bg-[#d55a31] rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Metrics'}
          </button>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {showCustomInputs && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(e.target.value, dateRange.end)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(dateRange.start, e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      )}

      {/* Last Synced */}
      {data.lastMetricsSync && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Last synced: {new Date(data.lastMetricsSync).toLocaleString()}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ListingStatCard
          title="Total Posts"
          value={data.summary.totalPosted}
          icon={BarChart3}
          variant="blue"
          subtitle="posted in period"
        />
        <ListingStatCard
          title="Impressions"
          value={data.summary.totalImpressions}
          icon={Eye}
          variant="purple"
          subtitle="total views"
        />
        <ListingStatCard
          title="Engagements"
          value={data.summary.totalEngagements}
          icon={Heart}
          variant="orange"
          subtitle="likes, shares, comments"
        />
        <ListingStatCard
          title="Engagement Rate"
          value={data.summary.avgEngagementRate}
          icon={TrendingUp}
          variant="green"
          subtitle="avg across platforms"
          decimals={1}
        />
      </div>

      {/* Platform Breakdown Bar Chart */}
      {data.byPlatform.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Platform Performance</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byPlatform}>
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
                  borderRadius: '8px',
                }}
                formatter={(value: unknown, name: unknown) => [Number(value).toLocaleString(), formatPlatformName(String(name))]}
                labelFormatter={(label: unknown) => formatPlatformName(String(label))}
              />
              <Legend />
              <Bar dataKey="impressions" name="Impressions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="engagements" name="Engagements" fill="#ed6437" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" name="Clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Platform breakdown table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Platform</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Posts</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Impressions</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Engagements</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Clicks</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Eng. Rate</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.byPlatform.map(p => (
                  <tr key={p.platform} className="border-b border-gray-100">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#6B7280' }}
                        />
                        <span className="font-medium text-gray-700">{formatPlatformName(p.platform)}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 text-gray-600">{p.postCount}</td>
                    <td className="text-right py-2 text-gray-600">{p.impressions.toLocaleString()}</td>
                    <td className="text-right py-2 text-gray-600">{p.engagements.toLocaleString()}</td>
                    <td className="text-right py-2 text-gray-600">{p.clicks.toLocaleString()}</td>
                    <td className="text-right py-2 font-medium text-gray-700">{p.engagementRate.toFixed(1)}%</td>
                    <td className="text-right py-2 font-medium text-gray-700">{p.clickRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Time Series Line Chart */}
      {data.timeSeries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Trends Over Time</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tickFormatter={formatDate}
                fontSize={12}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                labelFormatter={(label: unknown) => formatDate(String(label))}
                formatter={(value: unknown, name: unknown) => [Number(value).toLocaleString(), formatPlatformName(String(name))]}
              />
              <Legend />
              <Line type="monotone" dataKey="impressions" name="Impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="engagements" name="Engagements" stroke="#ed6437" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Content Type Performance Table */}
      {data.byContentType.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Content Type Performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Content Type</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Posts</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Impressions</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Engagements</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Clicks</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Eng. Rate</th>
                </tr>
              </thead>
              <tbody>
                {[...data.byContentType]
                  .sort((a, b) => b.impressions - a.impressions)
                  .map(ct => (
                    <tr key={ct.contentType} className="border-b border-gray-100">
                      <td className="py-2 font-medium text-gray-700 capitalize">{ct.contentType}</td>
                      <td className="text-right py-2 text-gray-600">{ct.postCount}</td>
                      <td className="text-right py-2 text-gray-600">{ct.impressions.toLocaleString()}</td>
                      <td className="text-right py-2 text-gray-600">{ct.engagements.toLocaleString()}</td>
                      <td className="text-right py-2 text-gray-600">{ct.clicks.toLocaleString()}</td>
                      <td className="text-right py-2 font-medium text-gray-700">{ct.engagementRate.toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Posting Cadence */}
      {(data.cadence.byDayOfWeek.length > 0 || data.cadence.byHourOfDay.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Day of Week */}
          {data.cadence.byDayOfWeek.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Posts by Day of Week</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.cadence.byDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={11} tickFormatter={(d: string) => d.slice(0, 3)} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" name="Posts" fill="#ed6437" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Hour of Day */}
          {data.cadence.byHourOfDay.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Posts by Hour of Day</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.cadence.byHourOfDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="hour"
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={(h: number) => `${h}:00`}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(h: unknown) => `${h}:00 - ${h}:59`}
                  />
                  <Bar dataKey="count" name="Posts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SocialAnalyticsDashboard — Wrapped with ErrorBoundary (ADVANCED tier)
 */
export function SocialAnalyticsDashboard() {
  return (
    <ErrorBoundary componentName="SocialAnalyticsDashboard">
      <SocialAnalyticsDashboardContent />
    </ErrorBoundary>
  );
}

export default SocialAnalyticsDashboard;
