/**
 * AnalyticsManager - Main Analytics Dashboard Container
 *
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use useListingAnalytics hook
 * - MUST use orange theme (#ed6437)
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingAnalytics } from '@features/dashboard/hooks/useListingAnalytics';
import { DateRangeSelector } from './analytics/DateRangeSelector';
import { AnalyticsSummaryCards } from './analytics/AnalyticsSummaryCards';
import { ViewsTrendChart } from './analytics/ViewsTrendChart';
import { SourcesChart } from './analytics/SourcesChart';
import { EngagementChart } from './analytics/EngagementChart';
import { ClicksByTypeChart } from './analytics/ClicksByTypeChart';
import { PerformanceInsightsPanel } from './analytics/PerformanceInsightsPanel';
import { ListingFunnelChart } from './analytics/ListingFunnelChart';
import { EngagementTimeSeries } from './analytics/EngagementTimeSeries';
import { TrafficSourceBreakdown } from './analytics/TrafficSourceBreakdown';
import { SocialPerformanceSection } from './analytics/SocialPerformanceSection';
import { CrossFeatureEngagementPanel } from './analytics/CrossFeatureEngagementPanel';
import { PerformanceComparison } from './analytics/PerformanceComparison';
import { GeographicHeatmap } from './analytics/GeographicHeatmap';
import { AlertCircle, Loader2, Download } from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export/fileDownload';

interface SubEntityCounts {
  eventCount: number;
  jobCount: number;
  offerCount: number;
}

export function AnalyticsManager() {
  const { selectedListingId } = useListingContext();
  const {
    analytics,
    isLoading,
    error,
    dateRange,
    setDateRange
  } = useListingAnalytics(selectedListingId);

  // Phase 5A: Cross-feature sub-entity counts
  const [subEntityCounts, setSubEntityCounts] = useState<SubEntityCounts>({
    eventCount: 0,
    jobCount: 0,
    offerCount: 0,
  });
  const [isLoadingSubEntities, setIsLoadingSubEntities] = useState(false);

  const fetchSubEntityCounts = useCallback(async () => {
    if (!selectedListingId) return;
    try {
      setIsLoadingSubEntities(true);
      const res = await fetch(
        `/api/listings/${selectedListingId}/cross-feature-completeness`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const result = await res.json();
        const counts = result.data?.subEntityCounts;
        if (counts) {
          setSubEntityCounts(counts);
        }
      }
    } catch {
      // Non-critical: panel will show zero counts
    } finally {
      setIsLoadingSubEntities(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    void fetchSubEntityCounts();
  }, [fetchSubEntityCounts]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No Data State
  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  // Calculate summary data
  const summaryData = {
    totalViews: analytics.totalViews,
    totalClicks: analytics.engagement.clicks,
    totalConversions: analytics.engagement.conversions,
    engagementRate: analytics.totalViews > 0
      ? (analytics.engagement.clicks / analytics.totalViews) * 100
      : 0
  };

  // Prepare engagement chart data
  const engagementChartData = [
    {
      metric: 'CTR',
      value: summaryData.engagementRate,
      unit: '%'
    },
    {
      metric: 'Avg Time',
      value: Math.round(analytics.engagement.averageTimeOnPage / 60),
      unit: 'min'
    },
    {
      metric: 'Bounce Rate',
      value: analytics.engagement.bounceRate,
      unit: '%'
    }
  ];

  // Prepare performance insights data
  const performanceData = {
    totalViews: analytics.totalViews,
    totalClicks: analytics.engagement.clicks,
    conversions: analytics.engagement.conversions,
    bounceRate: analytics.engagement.bounceRate,
    ctr: summaryData.engagementRate,
    sources: analytics.sources.map(s => ({
      source: s.source,
      percentage: s.percentage
    }))
  };

  // Export analytics data as CSV
  const handleExportCSV = () => {
    const rows: string[] = [];

    // Header
    rows.push('Listing Analytics Report');
    rows.push(`Date Range: ${dateRange.start} to ${dateRange.end}`);
    rows.push(`Generated: ${new Date().toLocaleString()}`);
    rows.push('');

    // Summary metrics
    rows.push('SUMMARY METRICS');
    rows.push('Metric,Value');
    rows.push(`Total Views,${analytics.totalViews}`);
    rows.push(`Total Clicks,${analytics.engagement.clicks}`);
    rows.push(`Total Conversions,${analytics.engagement.conversions}`);
    rows.push(`CTR (Click-Through Rate),${summaryData.engagementRate.toFixed(2)}%`);
    rows.push(`Avg Time on Page,${Math.round(analytics.engagement.averageTimeOnPage / 60)} min`);
    rows.push(`Bounce Rate,${analytics.engagement.bounceRate.toFixed(2)}%`);
    rows.push('');

    // Traffic sources
    rows.push('TRAFFIC SOURCES');
    rows.push('Source,Views,Percentage');
    analytics.sources.forEach(s => {
      rows.push(`${s.source},${s.views},${s.percentage.toFixed(1)}%`);
    });
    rows.push('');

    // Click breakdown
    rows.push('CLICK BREAKDOWN BY TYPE');
    rows.push('Event Type,Count,Percentage');
    const totalClicks = analytics.clicksByType?.reduce((sum, c) => sum + c.count, 0) || 0;
    analytics.clicksByType?.forEach(c => {
      const pct = totalClicks > 0 ? ((c.count / totalClicks) * 100).toFixed(1) : '0.0';
      rows.push(`${c.eventName},${c.count},${pct}%`);
    });
    rows.push('');

    // Views trend
    rows.push('VIEWS OVER TIME');
    rows.push('Date,Views');
    analytics.viewsTrend.forEach(v => {
      rows.push(`${v.date},${v.views}`);
    });

    // Engagement funnel
    if (analytics.funnel && analytics.funnel.stages.length > 0) {
      rows.push('');
      rows.push('ENGAGEMENT FUNNEL');
      rows.push('Stage,Count,Conversion Rate');
      analytics.funnel.stages.forEach(s => {
        const rate = s.conversion_rate !== null ? `${s.conversion_rate.toFixed(1)}%` : '—';
        rows.push(`${s.stage},${s.count},${rate}`);
      });
      rows.push(`Overall Conversion Rate,${analytics.funnel.overall_conversion_rate.toFixed(1)}%,`);
    }

    // Engagement time series
    if (analytics.trends && analytics.trends.length > 0) {
      rows.push('');
      rows.push('ENGAGEMENT TRENDS');
      rows.push('Date,Page Views,Engagements,Conversions,Shares');
      analytics.trends.forEach(t => {
        rows.push(`${t.date},${t.page_views},${t.engagements},${t.conversions},${t.shares}`);
      });
    }

    const csvContent = '\uFEFF' + rows.join('\r\n'); // UTF-8 BOM for Excel
    const filename = generateTimestampedFilename('listing-analytics', 'csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-900 font-semibold">Something went wrong loading analytics</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header: Export & Date Range (matches admin analytics pattern) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Export Button - Left side */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Date Range Selector - Right side */}
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Summary Cards */}
        <AnalyticsSummaryCards data={summaryData} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Views Trend */}
          <div className="lg:col-span-2">
            <ViewsTrendChart data={analytics.viewsTrend} />
          </div>

          {/* Traffic Sources */}
          <SourcesChart data={analytics.sources} />

          {/* Click Breakdown by Type */}
          <ClicksByTypeChart data={analytics.clicksByType || []} />

          {/* Engagement Metrics */}
          <EngagementChart data={engagementChartData} />

          {/* Performance Insights - New Panel */}
          <PerformanceInsightsPanel data={performanceData} />
        </div>

        {/* Phase 2A: Enhanced Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Funnel - Full width */}
          <div className="lg:col-span-2">
            <ListingFunnelChart data={analytics.funnel} isLoading={isLoading} />
          </div>

          {/* Engagement Time Series - Full width */}
          <div className="lg:col-span-2">
            <EngagementTimeSeries data={analytics.trends} isLoading={isLoading} />
          </div>

          {/* Enhanced Traffic Sources - Full width */}
          <div className="lg:col-span-2">
            <TrafficSourceBreakdown
              referrerSources={analytics.sources}
              isLoading={isLoading}
            />
          </div>

          {/* Social Share Performance - Full width */}
          {selectedListingId !== null && (
            <div className="lg:col-span-2">
              <SocialPerformanceSection listingId={selectedListingId} />
            </div>
          )}

          {/* Phase 5A: Cross-Feature Engagement Panel - Full width */}
          {selectedListingId !== null && (
            <div className="lg:col-span-2">
              <CrossFeatureEngagementPanel
                subEntityCounts={subEntityCounts}
                isLoading={isLoadingSubEntities}
              />
            </div>
          )}

          {/* Phase 5B: Performance Comparison - Full width */}
          {selectedListingId !== null && (
            <div className="lg:col-span-2">
              <PerformanceComparison listingId={selectedListingId} />
            </div>
          )}

          {/* Phase 5B: Geographic Heatmap - Full width */}
          {selectedListingId !== null && (
            <div className="lg:col-span-2">
              <GeographicHeatmap
                listingId={selectedListingId}
                latitude={null}
                longitude={null}
                listingName="Your Listing"
                totalViews={analytics.totalViews}
              />
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default AnalyticsManager;
