/**
 * ContentAnalyticsPanel - Content Analytics Dashboard Panel
 *
 * @description Full analytics dashboard for listing content performance
 * @component Client Component
 * @tier ADVANCED
 * @phase Content Phase 5B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5B_CONTENT_ANALYTICS_SEO_PREVIEW.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437)
 * - Recharts for LineChart and PieChart
 */
'use client';

import React from 'react';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useContentAnalyticsDashboard } from '@features/content/hooks/useContentAnalyticsDashboard';
import { ContentAnalyticsSummaryCards } from './ContentAnalyticsSummaryCards';
import { DateRangeSelector } from '@features/dashboard/components/managers/analytics/DateRangeSelector';

// ============================================================================
// Constants
// ============================================================================

const PIE_COLORS = ['#ed6437', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const TYPE_BADGE_STYLES: Record<string, string> = {
  article: 'bg-blue-100 text-blue-700',
  podcast: 'bg-purple-100 text-purple-700',
  video: 'bg-green-100 text-green-700',
};

// ============================================================================
// Inner Panel Content
// ============================================================================

function ContentAnalyticsPanelContent() {
  const { selectedListingId } = useListingContext();
  const { data, isLoading, error, refresh, dateRange, setDateRange } =
    useContentAnalyticsDashboard(selectedListingId);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 text-sm">{error}</p>
        <button
          onClick={() => void refresh()}
          className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty / no data state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <BarChart3 className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 text-sm">No analytics data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Content Analytics</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* KPI Cards */}
      <ContentAnalyticsSummaryCards
        data={{
          totalViews: data.totalViews,
          totalEngagements: data.totalEngagements,
          totalComments: data.totalComments,
          engagementRate: data.engagementRate,
        }}
      />

      {/* Views Trend — full-width LineChart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h3>
        {data.viewsTrend.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
            No view trend data for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.viewsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="views"
                name="Views"
                stroke="#ed6437"
                strokeWidth={2}
                dot={{ fill: '#ed6437', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Row: Engagement Breakdown + Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Breakdown PieChart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>
          {data.engagementBreakdown.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
              No engagement data for the selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.engagementBreakdown}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                >
                  {data.engagementBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Content Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Content</h3>
          {data.topContent.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
              No content found
            </div>
          ) : (
            <div className="overflow-auto max-h-[240px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-100">
                    <th className="pb-2 font-medium text-gray-600">Title</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topContent.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex shrink-0 items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              TYPE_BADGE_STYLES[item.type] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="truncate text-gray-800">{item.title}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        {item.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ContentAnalyticsPanel — wrapped with ErrorBoundary
// ============================================================================

export function ContentAnalyticsPanel() {
  return (
    <ErrorBoundary componentName="ContentAnalyticsPanel">
      <ContentAnalyticsPanelContent />
    </ErrorBoundary>
  );
}

export default ContentAnalyticsPanel;
