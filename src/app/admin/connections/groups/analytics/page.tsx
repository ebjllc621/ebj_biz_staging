/**
 * Admin Connection Groups Analytics Page
 * /admin/connections/groups/analytics
 *
 * Platform-wide group analytics dashboard.
 *
 * GOVERNANCE COMPLIANCE:
 * - Layout: AdminShell (provided by admin layout.tsx)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 *
 * @tier ADVANCED
 * @phase Phase 4A - Group Analytics, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import nextDynamic from 'next/dynamic';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import {
  Users,
  TrendingUp,
  ShoppingBag,
  Activity,
  Download,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';
import type { AdminGroupAnalytics } from '@features/connections/types/groups';

const Line = nextDynamic(() => import('react-chartjs-2').then(m => ({ default: m.Line })), { ssr: false });
const Bar = nextDynamic(() => import('react-chartjs-2').then(m => ({ default: m.Bar })), { ssr: false });
const Doughnut = nextDynamic(() => import('react-chartjs-2').then(m => ({ default: m.Doughnut })), { ssr: false });

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type DateRange = '7d' | '30d' | '90d';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function AdminGroupAnalyticsPageContent() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AdminGroupAnalytics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    const end = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const res = await fetch(
        `/api/admin/connections/groups/analytics?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        { credentials: 'include' }
      );
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load analytics');
      }
      setAnalytics(result.data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!analytics) return;

    const rows = [
      ['Metric', 'Value'],
      ['Total Groups', String(analytics.totalGroups)],
      ['Active Groups (30d)', String(analytics.activeGroups)],
      ['Total Members', String(analytics.totalMembers)],
      ['Avg Members / Group', String(analytics.averageMembersPerGroup)],
      ['Quote Pool Count', String(analytics.quotePoolCount)],
      ['Quote Pool Adoption %', String(analytics.quotePoolAdoptionRate)],
      ['PYMK Conversion Rate %', String(analytics.pymkConversionRate)]
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const filename = generateTimestampedFilename('admin-group-analytics', 'csv');
    downloadFile(csv, filename, 'text/csv');
  };

  const rangeOptions: DateRange[] = ['7d', '30d', '90d'];

  // Build chart data with useMemo to avoid recalculation on unrelated re-renders
  const timelineChartData = useMemo(() => analytics ? {
    labels: analytics.timeline.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Groups Created',
        data: analytics.timeline.map(t => t.groupsCreated),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        tension: 0.3
      },
      {
        label: 'Members Added',
        data: analytics.timeline.map(t => t.membersAdded),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.3
      }
    ]
  } : null, [analytics]);

  const sizeDistChartData = useMemo(() => analytics ? {
    labels: analytics.groupSizeDistribution.map(d => d.range),
    datasets: [
      {
        label: 'Groups',
        data: analytics.groupSizeDistribution.map(d => d.count),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
        ]
      }
    ]
  } : null, [analytics]);

  const doughnutData = useMemo(() => analytics ? {
    labels: ['Quote Pool Groups', 'Standard Groups'],
    datasets: [
      {
        data: [analytics.quotePoolCount, analytics.totalGroups - analytics.quotePoolCount],
        backgroundColor: ['#3B82F6', '#E5E7EB']
      }
    ]
  } : null, [analytics]);

  useEffect(() => {
    if (user?.role === 'admin') {
      void loadAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dateRange]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-red-600 font-medium">Access Denied: Admin privileges required</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connection Groups Analytics</h1>
          <p className="text-gray-500 mt-1">Platform-wide group metrics and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {rangeOptions.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  dateRange === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={!analytics}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => void loadAnalytics()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : analytics ? (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Groups"
              value={analytics.totalGroups}
              icon={Users}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard
              label="Active Groups (30d)"
              value={analytics.activeGroups}
              icon={Activity}
              color="text-green-600"
              bg="bg-green-50"
            />
            <StatCard
              label="Avg Members / Group"
              value={analytics.averageMembersPerGroup}
              icon={TrendingUp}
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <StatCard
              label="Quote Pool Adoption"
              value={`${analytics.quotePoolAdoptionRate}%`}
              icon={ShoppingBag}
              color="text-orange-600"
              bg="bg-orange-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Chart */}
            {timelineChartData && (
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Group & Member Growth</h2>
                <Line
                  data={timelineChartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'top' } },
                    scales: { y: { beginAtZero: true } }
                  }}
                />
              </div>
            )}

            {/* Doughnut: Quote Pool Adoption */}
            {doughnutData && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Quote Pool Adoption</h2>
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                  }}
                />
                <p className="text-center text-sm text-gray-500 mt-3">
                  PYMK Conversion Rate: <span className="font-semibold text-gray-900">{analytics.pymkConversionRate}%</span>
                </p>
              </div>
            )}
          </div>

          {/* Size Distribution Bar */}
          {sizeDistChartData && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Group Size Distribution</h2>
              <Bar
                data={sizeDistChartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }}
              />
            </div>
          )}

          {/* Top Creators Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Top Group Creators</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.topCreators.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-gray-400 text-sm">No data</td>
                    </tr>
                  ) : (
                    analytics.topCreators.map((creator, idx) => (
                      <tr key={creator.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-500">#{idx + 1}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{creator.username}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{creator.groupCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminGroupAnalyticsPage() {
  return (
    <ErrorBoundary
      componentName="AdminGroupAnalyticsPage"
      fallback={<ErrorFallback message="Unable to load group analytics." />}
    >
      <AdminGroupAnalyticsPageContent />
    </ErrorBoundary>
  );
}
