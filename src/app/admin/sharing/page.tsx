/**
 * Admin Sharing Analytics Dashboard Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data visualizations, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - Real-time sharing metrics overview
 * - Conversion funnel visualization
 * - Quality metrics and scoring
 * - Spam detection panel
 * - A/B test performance comparison
 * - Breakdown by entity type, sender, recipient
 *
 * @tier ADVANCED
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorService } from '@core/services/ErrorService';
import {
  RefreshCw,
  Eye,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import {
  SharingMetricsCard,
  SharingQualityGauge,
  SpamDetectionPanel,
  SharingFunnelChart,
  ABTestResultsTable
} from '@features/contacts/components/admin';

// =============================================================================
// Types
// =============================================================================

interface MetricsOverview {
  total_recommendations: number;
  total_views: number;
  total_helpful: number;
  total_not_helpful: number;
  total_thanked: number;
  avg_quality_score: number;
  spam_flag_count: number;
}

interface FunnelMetrics {
  period: 'day' | 'week' | 'month';
  stages: {
    sent: number;
    viewed: number;
    rated: number;
    helpful: number;
    thanked: number;
  };
  conversion_rates: {
    view_rate: number;
    rating_rate: number;
    helpful_rate: number;
    thank_rate: number;
  };
}

interface QualityMetrics {
  total_rated: number;
  helpful_count: number;
  not_helpful_count: number;
  helpful_rate: number;
  avg_view_time_seconds: number | null;
  engagement_score: number;
}

interface DashboardState {
  overview: MetricsOverview | null;
  funnel: FunnelMetrics | null;
  quality: QualityMetrics | null;
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Main Content Component
// =============================================================================

function SharingAnalyticsDashboardContent() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>({
    overview: null,
    funnel: null,
    quality: null,
    isLoading: true,
    error: null
  });
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [overviewRes, funnelRes, qualityRes] = await Promise.all([
        fetch('/api/admin/sharing/metrics/overview', { credentials: 'include' }),
        fetch(`/api/admin/sharing/metrics/funnel?period=${period}`, { credentials: 'include' }),
        fetch('/api/admin/sharing/metrics/quality', { credentials: 'include' })
      ]);

      if (!overviewRes.ok || !funnelRes.ok || !qualityRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [overviewData, funnelData, qualityData] = await Promise.all([
        overviewRes.json(),
        funnelRes.json(),
        qualityRes.json()
      ]);

      setState({
        overview: overviewData.data || overviewData,
        funnel: funnelData.data || funnelData,
        quality: qualityData.data || qualityData,
        isLoading: false,
        error: null
      });
    } catch (err) {
      ErrorService.capture('[SharingAnalyticsDashboard] Load error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard data'
      }));
    }
  }, [period]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();

      // Auto-refresh every 60 seconds
      const interval = setInterval(loadDashboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [user?.role, loadDashboardData]);

  // Admin check
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-600">
        Access denied. Admin privileges required.
      </div>
    );
  }

  const { overview, funnel, quality, isLoading, error } = state;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sharing Analytics</h1>
            <p className="text-sm text-gray-600">Monitor recommendation system health and metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg text-sm hover:bg-[#d55730] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && !overview && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {/* Overview Metrics Cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SharingMetricsCard
              icon={BarChart3}
              label="Total Recommendations"
              value={overview.total_recommendations}
              subValue={`${overview.total_views} views`}
              color="blue"
            />
            <SharingMetricsCard
              icon={Eye}
              label="View Rate"
              value={overview.total_recommendations > 0
                ? `${((overview.total_views / overview.total_recommendations) * 100).toFixed(1)}%`
                : '0%'
              }
              subValue={`${overview.total_views.toLocaleString()} total views`}
              color="green"
            />
            <SharingMetricsCard
              icon={ThumbsUp}
              label="Helpful Rate"
              value={
                (overview.total_helpful + overview.total_not_helpful) > 0
                  ? `${((overview.total_helpful / (overview.total_helpful + overview.total_not_helpful)) * 100).toFixed(1)}%`
                  : '0%'
              }
              subValue={`${overview.total_helpful} helpful`}
              color="orange"
            />
            <SharingMetricsCard
              icon={MessageSquare}
              label="Thank You Rate"
              value={overview.total_recommendations > 0
                ? `${((overview.total_thanked / overview.total_recommendations) * 100).toFixed(1)}%`
                : '0%'
              }
              subValue={`${overview.total_thanked} thanked`}
              color="purple"
            />
          </div>
        )}

        {/* Quality Score & Spam Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {quality && (
            <SharingQualityGauge
              score={quality.engagement_score}
              label="Overall Engagement Score"
              showBreakdown={false}
            />
          )}

          {overview && overview.spam_flag_count > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Spam Alerts</h3>
                </div>
                <p className="text-3xl font-bold text-red-600">{overview.spam_flag_count}</p>
                <p className="text-sm text-gray-600 mt-1">Pending review</p>
              </div>
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        {funnel && (
          <ErrorBoundary componentName="SharingFunnelChart">
            <SharingFunnelChart
              data={funnel.stages}
              conversionRates={funnel.conversion_rates}
            />
          </ErrorBoundary>
        )}

        {/* Spam Detection Panel */}
        <ErrorBoundary componentName="SpamDetectionPanel">
          <SpamDetectionPanel />
        </ErrorBoundary>

        {/* A/B Test Results */}
        <ErrorBoundary componentName="ABTestResultsTable">
          <ABTestResultsTable />
        </ErrorBoundary>

        {/* Empty State */}
        {!isLoading && !error && !overview && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-600">
              Analytics data will appear here once users start sharing recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function SharingAnalyticsDashboardPage() {
  return (
    <ErrorBoundary componentName="SharingAnalyticsDashboard">
      <SharingAnalyticsDashboardContent />
    </ErrorBoundary>
  );
}
