/**
 * ContentAnalyticsDashboard - Platform-wide Content Analytics Dashboard
 *
 * @description Admin page showing content KPIs, type distribution, engagement breakdown,
 *              views trend, and top performers across articles, podcasts, and videos
 * @component Client Component
 * @tier STANDARD
 * @phase Content Phase 4B - Admin Content Analytics
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_4B_ADMIN_CONTENT_ANALYTICS.md
 * @reference src/features/listings/components/admin/AdminListingAnalytics.tsx
 *
 * USAGE:
 * Rendered in src/app/admin/content/analytics/page.tsx
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RefreshCw, Loader2, AlertCircle, FileText, Eye, TrendingUp, Share2 } from 'lucide-react';

const CONTENT_COLORS = {
  articles: '#3b82f6',
  podcasts: '#14b8a6',
  videos: '#8b5cf6',
};

interface ContentAnalyticsData {
  summary: {
    totalContent: number;
    totalArticles: number;
    totalPodcasts: number;
    totalVideos: number;
    totalPageViews: number;
    totalEngagements: number;
    totalComments: number;
    totalRecommendations: number;
  };
  byType: Array<{ type: string; count: number }>;
  viewsTrend: Array<{ date: string; articles: number; podcasts: number; videos: number }>;
  topPerformers: Array<{ id: number; title: string; type: string; slug: string; views: number; comments: number; recommendations: number }>;
  engagementBreakdown: Array<{ event: string; count: number }>;
}

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: typeof FileText;
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

function getTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'article': return 'bg-blue-50 text-blue-700';
    case 'podcast': return 'bg-teal-50 text-teal-700';
    case 'video': return 'bg-purple-50 text-purple-700';
    default: return 'bg-gray-50 text-gray-700';
  }
}

function ContentAnalyticsDashboardContent() {
  const [data, setData] = useState<ContentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics/content', {
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
        <h1 className="text-2xl font-bold text-gray-900">Content Analytics</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Content"
          value={data.summary.totalContent.toLocaleString()}
          icon={FileText}
          color="text-[#ed6437] bg-orange-50"
        />
        <SummaryCard
          label="Page Views"
          value={data.summary.totalPageViews.toLocaleString()}
          icon={Eye}
          color="text-blue-600 bg-blue-50"
        />
        <SummaryCard
          label="Engagements"
          value={data.summary.totalEngagements.toLocaleString()}
          icon={TrendingUp}
          color="text-green-600 bg-green-50"
        />
        <SummaryCard
          label="Recommendations"
          value={data.summary.totalRecommendations.toLocaleString()}
          icon={Share2}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Type Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Type Distribution</h3>
          {data.byType.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.byType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }: { name?: string; value?: number }) => name && value !== undefined ? `${name} (${value})` : ''}
                >
                  <Cell key="articles" fill={CONTENT_COLORS.articles} />
                  <Cell key="podcasts" fill={CONTENT_COLORS.podcasts} />
                  <Cell key="videos" fill={CONTENT_COLORS.videos} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Engagement Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Breakdown</h3>
          {data.engagementBreakdown.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.engagementBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '11px' }} />
                <YAxis
                  type="category"
                  dataKey="event"
                  width={140}
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

      {/* Views Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Views Trend (30 days)</h3>
        {data.viewsTrend.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">No trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.viewsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="articles" stroke={CONTENT_COLORS.articles} strokeWidth={2} dot={{ fill: CONTENT_COLORS.articles, r: 4 }} />
              <Line type="monotone" dataKey="podcasts" stroke={CONTENT_COLORS.podcasts} strokeWidth={2} dot={{ fill: CONTENT_COLORS.podcasts, r: 4 }} />
              <Line type="monotone" dataKey="videos" stroke={CONTENT_COLORS.videos} strokeWidth={2} dot={{ fill: CONTENT_COLORS.videos, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Performers Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
        {data.topPerformers.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No performance data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Title</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Views</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Comments</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Recommendations</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((item, index) => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{item.title}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${getTypeBadgeClasses(item.type)}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">{item.views.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{item.comments.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{item.recommendations.toLocaleString()}</td>
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

export function ContentAnalyticsDashboard() {
  return (
    <ErrorBoundary componentName="ContentAnalyticsDashboard">
      <ContentAnalyticsDashboardContent />
    </ErrorBoundary>
  );
}
