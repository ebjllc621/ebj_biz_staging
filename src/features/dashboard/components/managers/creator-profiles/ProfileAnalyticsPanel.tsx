/**
 * ProfileAnalyticsPanel - Profile Analytics Dashboard Panel
 *
 * @description Full analytics dashboard for creator profile performance
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8C
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8C_PROFILE_ANALYTICS_SEO_PREVIEW.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437)
 * - Recharts for LineChart
 * - Replicates ContentAnalyticsPanel pattern exactly
 */
'use client';

import React from 'react';
import { Loader2, AlertCircle, BarChart3, Share2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useProfileAnalyticsDashboard } from '@features/content/hooks/useProfileAnalyticsDashboard';
import { ProfileAnalyticsSummaryCards } from './ProfileAnalyticsSummaryCards';
import { DateRangeSelector } from '@features/dashboard/components/managers/analytics/DateRangeSelector';

// ============================================================================
// Props
// ============================================================================

export interface ProfileAnalyticsPanelProps {
  profileType: 'affiliate_marketer' | 'internet_personality';
  profileId: number;
}

// ============================================================================
// Inner Panel Content
// ============================================================================

function ProfileAnalyticsPanelContent({ profileType, profileId }: ProfileAnalyticsPanelProps) {
  const { selectedListingId } = useListingContext();
  const { data, isLoading, error, refresh, dateRange, setDateRange } =
    useProfileAnalyticsDashboard(selectedListingId, profileType, profileId);

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
      {/* Header row: title + DateRangeSelector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Profile Analytics</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* KPI Cards */}
      <ProfileAnalyticsSummaryCards data={data} />

      {/* View Trend — full-width LineChart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h3>
        {data.viewTrend.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
            No view trend data for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.viewTrend}>
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

      {/* Bottom row: Contact Funnel + Recommendation stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Conversion Funnel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Conversion Funnel</h3>
          {data.contactFunnel.every(f => f.count === 0) ? (
            <div className="flex items-center justify-center h-[160px] text-gray-400 text-sm">
              No contact data for the selected period
            </div>
          ) : (
            <div className="space-y-4">
              {data.contactFunnel.map((stage) => {
                const maxCount = data.contactFunnel[0]?.count ?? 1;
                const barWidth = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0;
                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-semibold">{stage.count.toLocaleString()}</span>
                        {stage.conversionRate !== null && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {stage.conversionRate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#ed6437] rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommendation stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          {data.kpis.recommendationCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-[160px] gap-3 text-center">
              <Share2 className="w-10 h-10 text-gray-200" />
              <p className="text-gray-500 text-sm">No recommendations yet.</p>
              <p className="text-gray-400 text-xs max-w-[240px]">
                Encourage satisfied contacts to recommend your profile to grow your reach.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[160px] gap-2">
              <Share2 className="w-10 h-10 text-[#ed6437]" />
              <p className="text-4xl font-bold text-gray-900">
                {data.kpis.recommendationCount.toLocaleString()}
              </p>
              <p className="text-gray-500 text-sm">
                {data.kpis.recommendationCount === 1 ? 'recommendation' : 'recommendations'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ProfileAnalyticsPanel — wrapped with ErrorBoundary
// ============================================================================

export function ProfileAnalyticsPanel({ profileType, profileId }: ProfileAnalyticsPanelProps) {
  return (
    <ErrorBoundary componentName="ProfileAnalyticsPanel">
      <ProfileAnalyticsPanelContent profileType={profileType} profileId={profileId} />
    </ErrorBoundary>
  );
}

export default ProfileAnalyticsPanel;
