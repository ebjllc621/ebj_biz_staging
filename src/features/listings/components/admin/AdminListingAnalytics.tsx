/**
 * AdminListingAnalytics - Platform-wide Listing Analytics Dashboard
 *
 * @description Admin page showing listing KPIs, tier distribution, category breakdown,
 *              top performers, and engagement trends
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 * @reference src/features/events/components/admin/EventsKPIDashboard.tsx
 *
 * USAGE:
 * Rendered in src/app/admin/listings/analytics/page.tsx
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RefreshCw, Loader2, AlertCircle, Building2, TrendingUp, Users } from 'lucide-react';

const COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7'];

interface AdminAnalyticsData {
  summary: {
    totalListings: number;
    activeListings: number;
    avgEngagementRate: number;
  };
  byTier: Array<{ tier: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  topPerformers: Array<{ id: number; name: string; tier: string; views: number; engagements: number }>;
  engagementTrend: Array<{ month: string; views: number; engagements: number }>;
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: typeof Building2;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AdminListingAnalyticsContent() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics/listings', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load analytics');
      const result = await res.json();
      setData(result.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={() => void fetchAnalytics()}
              className="mt-3 px-4 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Listing Analytics</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">Updated {lastUpdated}</span>
          )}
          <button
            onClick={() => void fetchAnalytics()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Listings"
          value={data.summary.totalListings.toLocaleString()}
          icon={Building2}
          color="text-[#ed6437] bg-orange-50"
        />
        <SummaryCard
          label="Active (30 days)"
          value={data.summary.activeListings.toLocaleString()}
          icon={Users}
          color="text-green-600 bg-green-50"
        />
        <SummaryCard
          label="Avg Engagement Rate"
          value={`${data.summary.avgEngagementRate}%`}
          icon={TrendingUp}
          color="text-blue-600 bg-blue-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Listings by Tier</h3>
          {data.byTier.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.byTier}
                  dataKey="count"
                  nameKey="tier"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }: { name?: string; value?: number }) => name && value !== undefined ? `${name} (${value})` : ''}
                >
                  {data.byTier.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
          {data.byCategory.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  stroke="#6b7280"
                  style={{ fontSize: '11px' }}
                  tick={{ fill: '#374151' }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#ed6437" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Engagement Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Trend (6 months)</h3>
        {data.engagementTrend.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">No trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#ed6437" strokeWidth={2} dot={{ fill: '#ed6437', r: 4 }} />
              <Line type="monotone" dataKey="engagements" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Performers Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Listings (30 days)</h3>
        {data.topPerformers.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No performance data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Listing</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Tier</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Views</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Engagements</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Eng. Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((listing, index) => (
                  <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{listing.name}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 capitalize">
                        {listing.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">{listing.views.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{listing.engagements.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {listing.views > 0
                        ? `${((listing.engagements / listing.views) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminListingAnalytics() {
  return (
    <ErrorBoundary componentName="AdminListingAnalytics">
      <AdminListingAnalyticsContent />
    </ErrorBoundary>
  );
}
