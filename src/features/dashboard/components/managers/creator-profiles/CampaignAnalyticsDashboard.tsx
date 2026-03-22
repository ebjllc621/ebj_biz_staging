/**
 * CampaignAnalyticsDashboard - Full Campaign Analytics Dashboard for Affiliate Marketers
 *
 * @description Shows campaign KPIs, conversion trends, network performance,
 *   traffic sources, benchmark comparison, and a sortable campaign table.
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9A_AFFILIATE_MARKETER_CAMPAIGN_ANALYTICS.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437)
 * - Recharts for charts
 * - Replicates ProfileAnalyticsPanel pattern
 */
'use client';

import React from 'react';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useCampaignAnalyticsDashboard } from '@features/content/hooks/useCampaignAnalyticsDashboard';
import { DateRangeSelector } from '@features/dashboard/components/managers/analytics/DateRangeSelector';
import { CampaignAnalyticsSummaryCards } from './CampaignAnalyticsSummaryCards';
import { CampaignConversionTrendChart } from './CampaignConversionTrendChart';
import { NetworkPerformancePanel } from './NetworkPerformancePanel';
import { CampaignTrafficSourcePanel } from './CampaignTrafficSourcePanel';
import { CampaignBenchmarkPanel } from './CampaignBenchmarkPanel';
import { CampaignPerformanceTable } from './CampaignPerformanceTable';

// ============================================================================
// Props
// ============================================================================

export interface CampaignAnalyticsDashboardProps {
  profileId: number;
}

// ============================================================================
// Inner Dashboard Content
// ============================================================================

function CampaignAnalyticsDashboardContent({ profileId }: CampaignAnalyticsDashboardProps) {
  const { selectedListingId } = useListingContext();
  const { data, isLoading, error, refresh, dateRange, setDateRange } =
    useCampaignAnalyticsDashboard(selectedListingId, profileId);

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
        <p className="text-gray-500 text-sm">No campaign analytics data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row: title + DateRangeSelector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Campaign Analytics</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* KPI Cards */}
      <CampaignAnalyticsSummaryCards data={data} />

      {/* Trend + Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignConversionTrendChart data={data.conversionTrend} />
        <NetworkPerformancePanel data={data.networkBreakdown} />
      </div>

      {/* Traffic + Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignTrafficSourcePanel data={data.trafficSources} />
        <CampaignBenchmarkPanel
          benchmark={data.categoryBenchmark}
          ownConversionRate={data.campaignKpis.avgConversionRate}
        />
      </div>

      {/* Campaign table */}
      <CampaignPerformanceTable campaigns={data.campaigns} />
    </div>
  );
}

// ============================================================================
// CampaignAnalyticsDashboard — wrapped with ErrorBoundary
// ============================================================================

export function CampaignAnalyticsDashboard({ profileId }: CampaignAnalyticsDashboardProps) {
  return (
    <ErrorBoundary componentName="CampaignAnalyticsDashboard">
      <CampaignAnalyticsDashboardContent profileId={profileId} />
    </ErrorBoundary>
  );
}

export default CampaignAnalyticsDashboard;
