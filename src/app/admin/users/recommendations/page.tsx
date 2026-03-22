/**
 * Admin Recommendations Analytics Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (multiple data visualizations)
 *
 * Features:
 * - Real-time recommendation metrics (impressions, interactions, requests)
 * - Conversion funnel visualization
 * - A/B test variant performance comparison
 * - Algorithm health indicators
 *
 * @phase Phase 8F - Analytics & A/B Testing
 * @authority PHASE_8F_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorService } from '@core/services/ErrorService';
import {
  BarChart3,
  Users,
  TrendingUp,
  Target,
  FlaskConical,
  RefreshCw,
  ArrowRight,
  Eye,
  MousePointer,
  UserPlus,
  Check,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface RealtimeMetrics {
  lastHour: {
    impressions: number;
    interactions: number;
    requests: number;
  };
  today: {
    impressions: number;
    interactions: number;
    requests: number;
    acceptances: number;
  };
  activeVariants: Array<{
    variantId: string;
    name: string;
    rolloutPercentage: number;
    impressions: number;
  }>;
  topRecommendedUsers: Array<{
    userId: number;
    displayName: string | null;
    impressions: number;
    interactionRate: number;
  }>;
}

interface FunnelMetrics {
  period: 'day' | 'week' | 'month';
  stages: {
    impressions: number;
    interactions: number;
    requestsSent: number;
    requestsAccepted: number;
    firstMessages: number;
  };
  conversionRates: {
    impressionToInteraction: number;
    interactionToRequest: number;
    requestToAccepted: number;
    acceptedToMessage: number;
    overallConversion: number;
  };
}

interface VariantPerformance {
  variantId: string;
  variantName: string;
  metrics: {
    totalRecommendations: number;
    uniqueUsersServed: number;
    avgScore: number;
    connectionRequestRate: number;
    acceptanceRate: number;
    avgRelevanceRating: number | null;
    reasonsHelpfulRate: number | null;
  };
}

interface DashboardState {
  realtimeMetrics: RealtimeMetrics | null;
  funnelMetrics: FunnelMetrics | null;
  variantPerformance: VariantPerformance[];
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// Main Content Component
// =============================================================================

function RecommendationsAnalyticsContent() {
  const { user } = useAuth();
  const [state, setState] = useState<DashboardState>({
    realtimeMetrics: null,
    funnelMetrics: null,
    variantPerformance: [],
    isLoading: true,
    error: null
  });
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [realtimeRes, funnelRes, variantsRes] = await Promise.all([
        fetch('/api/admin/recommendations/metrics/realtime', { credentials: 'include' }),
        fetch(`/api/admin/recommendations/metrics/funnel?period=${period}`, { credentials: 'include' }),
        fetch(`/api/admin/recommendations/variants/performance?period=${period}`, { credentials: 'include' })
      ]);

      // Check for errors
      if (!realtimeRes.ok || !funnelRes.ok || !variantsRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [realtimeData, funnelData, variantsData] = await Promise.all([
        realtimeRes.json(),
        funnelRes.json(),
        variantsRes.json()
      ]);

      setState({
        realtimeMetrics: realtimeData.data || realtimeData,
        funnelMetrics: funnelData.data || funnelData,
        variantPerformance: variantsData.data || variantsData || [],
        isLoading: false,
        error: null
      });
    } catch (err) {
      ErrorService.capture('[RecommendationsAnalytics] Load error:', err);
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

  const { realtimeMetrics, funnelMetrics, variantPerformance, isLoading, error } = state;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendation Analytics</h1>
          <p className="text-sm text-gray-600">Monitor algorithm performance and A/B tests</p>
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
      {isLoading && !realtimeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Real-time Metrics Cards */}
      {realtimeMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Eye className="w-5 h-5 text-blue-600" />}
            label="Impressions (Today)"
            value={realtimeMetrics.today.impressions.toLocaleString()}
            subValue={`${realtimeMetrics.lastHour.impressions} last hour`}
            color="blue"
          />
          <MetricCard
            icon={<MousePointer className="w-5 h-5 text-green-600" />}
            label="Interactions (Today)"
            value={realtimeMetrics.today.interactions.toLocaleString()}
            subValue={`${realtimeMetrics.lastHour.interactions} last hour`}
            color="green"
          />
          <MetricCard
            icon={<UserPlus className="w-5 h-5 text-orange-600" />}
            label="Connection Requests"
            value={realtimeMetrics.today.requests.toLocaleString()}
            subValue={`${realtimeMetrics.today.acceptances} accepted`}
            color="orange"
          />
          <MetricCard
            icon={<FlaskConical className="w-5 h-5 text-purple-600" />}
            label="Active Variants"
            value={realtimeMetrics.activeVariants.length.toString()}
            subValue="A/B tests running"
            color="purple"
          />
        </div>
      )}

      {/* Conversion Funnel */}
      {funnelMetrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h2>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
            <FunnelStage
              icon={<Eye className="w-5 h-5" />}
              label="Impressions"
              value={funnelMetrics.stages.impressions}
              rate={100}
              isFirst
            />
            <FunnelArrow rate={funnelMetrics.conversionRates.impressionToInteraction} />
            <FunnelStage
              icon={<MousePointer className="w-5 h-5" />}
              label="Interactions"
              value={funnelMetrics.stages.interactions}
              rate={funnelMetrics.conversionRates.impressionToInteraction}
            />
            <FunnelArrow rate={funnelMetrics.conversionRates.interactionToRequest} />
            <FunnelStage
              icon={<UserPlus className="w-5 h-5" />}
              label="Requests Sent"
              value={funnelMetrics.stages.requestsSent}
              rate={funnelMetrics.conversionRates.interactionToRequest}
            />
            <FunnelArrow rate={funnelMetrics.conversionRates.requestToAccepted} />
            <FunnelStage
              icon={<Check className="w-5 h-5" />}
              label="Accepted"
              value={funnelMetrics.stages.requestsAccepted}
              rate={funnelMetrics.conversionRates.requestToAccepted}
            />
            <FunnelArrow rate={funnelMetrics.conversionRates.acceptedToMessage} />
            <FunnelStage
              icon={<MessageSquare className="w-5 h-5" />}
              label="First Message"
              value={funnelMetrics.stages.firstMessages}
              rate={funnelMetrics.conversionRates.acceptedToMessage}
            />
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <span className="text-sm text-gray-600">Overall Conversion: </span>
            <span className="text-lg font-semibold text-[#ed6437]">
              {funnelMetrics.conversionRates.overallConversion.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500 ml-2">(Impression to First Message)</span>
          </div>
        </div>
      )}

      {/* A/B Test Performance Table */}
      {variantPerformance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">A/B Test Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Variant</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Impressions</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Request Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Accept Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Avg Rating</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Reasons Helpful</th>
                </tr>
              </thead>
              <tbody>
                {variantPerformance.map((variant) => (
                  <tr key={variant.variantId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{variant.variantName}</span>
                        {variant.variantId === 'control' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            Control
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700">
                      {variant.metrics.totalRecommendations.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`font-medium ${variant.metrics.connectionRequestRate > 5 ? 'text-green-600' : 'text-gray-700'}`}>
                        {variant.metrics.connectionRequestRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`font-medium ${variant.metrics.acceptanceRate > 50 ? 'text-green-600' : 'text-gray-700'}`}>
                        {variant.metrics.acceptanceRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      {variant.metrics.avgRelevanceRating !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-medium text-gray-700">
                            {variant.metrics.avgRelevanceRating.toFixed(1)}
                          </span>
                          <span className="text-gray-400">/5</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="text-right py-3 px-4">
                      {variant.metrics.reasonsHelpfulRate !== null ? (
                        <div className="flex items-center justify-end gap-1">
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-gray-700">
                            {variant.metrics.reasonsHelpfulRate.toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Recommended Users */}
      {realtimeMetrics && realtimeMetrics.topRecommendedUsers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Recommended Users (Today)</h2>
          <div className="space-y-3">
            {realtimeMetrics.topRecommendedUsers.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">{user.displayName || `User ${user.userId}`}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">{user.impressions} impressions</span>
                  <span className={`font-medium ${user.interactionRate > 10 ? 'text-green-600' : 'text-gray-600'}`}>
                    {user.interactionRate.toFixed(1)}% interaction rate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && !realtimeMetrics && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
          <p className="text-gray-600">
            Analytics data will appear here once users start interacting with recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function MetricCard({
  icon,
  label,
  value,
  subValue,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bgColors[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subValue}</div>
    </div>
  );
}

function FunnelStage({
  icon,
  label,
  value,
  rate,
  isFirst = false
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  rate: number;
  isFirst?: boolean;
}) {
  return (
    <div className="text-center flex-1 min-w-[100px]">
      <div className="flex items-center justify-center mb-2 text-gray-400">
        {icon}
      </div>
      <div className="text-xl lg:text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {!isFirst && (
        <div className="text-xs text-green-600 mt-1 font-medium">{rate.toFixed(1)}%</div>
      )}
    </div>
  );
}

function FunnelArrow({ rate }: { rate: number }) {
  return (
    <div className="hidden lg:flex items-center px-2 text-gray-300">
      <ArrowRight className="w-5 h-5" />
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function RecommendationsAnalyticsPage() {
  return (
    <ErrorBoundary componentName="RecommendationsAnalytics">
      <RecommendationsAnalyticsContent />
    </ErrorBoundary>
  );
}
