/**
 * GuideAnalyticsDashboard - Analytics dashboard for guide performance
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 2 Content Types - Phase G9B
 * @reference src/features/dashboard/components/managers/newsletter/NewsletterAnalyticsDashboard.tsx
 *
 * GOVERNANCE:
 * - 'use client' directive
 * - ErrorBoundary (ADVANCED tier)
 * - ListingStatCard for KPI cards
 * - Recharts for charts
 * - Bizconekt orange #ed6437
 */
'use client';

import React from 'react';
import { Eye, CheckCircle, Users, TrendingUp, ArrowLeft, Loader2, AlertCircle, Bookmark, Share2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';
import { useGuideAnalyticsDashboard } from '@features/content/hooks/useGuideAnalyticsDashboard';

interface GuideAnalyticsDashboardProps {
  listingId: number;
  guideId: number;
  guideTitle: string;
  onBack: () => void;
}

function GuideAnalyticsDashboardContent({
  listingId,
  guideId,
  guideTitle,
  onBack,
}: GuideAnalyticsDashboardProps) {
  const { data, isLoading, error } = useGuideAnalyticsDashboard(listingId, guideId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Guides
        </button>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const analytics = data?.analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-semibold text-gray-900">{guideTitle} — Analytics</h2>
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ListingStatCard
            title="Total Views"
            value={analytics.totals.views}
            icon={Eye}
            variant="blue"
            subtitle="page views"
          />
          <ListingStatCard
            title="Completions"
            value={analytics.totals.completions}
            icon={CheckCircle}
            variant="green"
            subtitle="guide completions"
          />
          <ListingStatCard
            title="Users Started"
            value={analytics.totals.usersStarted}
            icon={Users}
            variant="purple"
            subtitle="users tracking progress"
          />
          <ListingStatCard
            title="Completion Rate"
            value={analytics.totals.completionRate}
            icon={TrendingUp}
            variant="orange"
            subtitle="of started users"
          />
        </div>
      )}

      {/* Progress Distribution Chart */}
      {analytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Distribution</h3>
          {analytics.progressDistribution.every(d => d.count === 0) ? (
            <div className="h-[250px] flex items-center justify-center text-gray-500">
              No progress data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.progressDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis dataKey="range" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="#ed6437" radius={[0, 4, 4, 0]} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Section Completion Rates */}
      {analytics && analytics.sectionCompletionRates.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Completion Rates</h3>
          <ResponsiveContainer width="100%" height={Math.max(200, analytics.sectionCompletionRates.length * 40)}>
            <BarChart data={analytics.sectionCompletionRates} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" domain={[0, 100]} stroke="#6b7280" style={{ fontSize: '12px' }} unit="%" />
              <YAxis dataKey="title" type="category" stroke="#6b7280" style={{ fontSize: '11px' }} width={150} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Completion Rate']}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Bar dataKey="completionRate" fill="#22c55e" radius={[0, 4, 4, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement Summary */}
      {analytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Engagement Summary</h3>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-blue-500" />
              {analytics.totals.bookmarks} bookmarks
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-green-500" />
              {analytics.totals.shares} shares
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function GuideAnalyticsDashboard(props: GuideAnalyticsDashboardProps) {
  return (
    <ErrorBoundary componentName="GuideAnalyticsDashboard">
      <GuideAnalyticsDashboardContent {...props} />
    </ErrorBoundary>
  );
}

export default GuideAnalyticsDashboard;
