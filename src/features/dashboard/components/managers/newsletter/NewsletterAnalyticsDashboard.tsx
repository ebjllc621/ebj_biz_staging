/**
 * NewsletterAnalyticsDashboard - Analytics dashboard for newsletter performance
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 2 Content Types - Phase N8
 * @reference src/features/dashboard/components/managers/AnalyticsManager.tsx
 *
 * GOVERNANCE:
 * - 'use client' directive
 * - ErrorBoundary (ADVANCED tier)
 * - ListingStatCard for KPI cards
 * - Recharts for charts
 * - DateRangeSelector for date range
 * - Bizconekt orange #ed6437
 */
'use client';

import React from 'react';
import { MailOpen, MousePointer, Eye, TrendingUp, ArrowLeft, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingStatCard } from '@features/dashboard/components/ListingStatCard';
import { DateRangeSelector } from '@features/dashboard/components/managers/analytics/DateRangeSelector';
import { useNewsletterAnalyticsDashboard } from '@features/content/hooks/useNewsletterAnalyticsDashboard';

interface NewsletterAnalyticsDashboardProps {
  listingId: number;
  newsletterId: number;
  newsletterTitle: string;
  onBack: () => void;
}

function NewsletterAnalyticsDashboardContent({
  listingId,
  newsletterId,
  newsletterTitle,
  onBack,
}: NewsletterAnalyticsDashboardProps) {
  const { data, isLoading, error, dateRange, setDateRange } = useNewsletterAnalyticsDashboard(listingId, newsletterId);

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
          <ArrowLeft className="w-4 h-4" /> Back to Newsletters
        </button>
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const analytics = data?.analytics;
  const subscriberGrowth = data?.subscriberGrowth;
  const deliveryStats = data?.deliveryStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{newsletterTitle} — Analytics</h2>
        </div>
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ListingStatCard
            title="Total Opens"
            value={analytics.totals.opens}
            icon={MailOpen}
            variant="blue"
            subtitle="email opens"
          />
          <ListingStatCard
            title="Total Clicks"
            value={analytics.totals.clicks}
            icon={MousePointer}
            variant="green"
            subtitle="link clicks"
          />
          <ListingStatCard
            title="Web Views"
            value={analytics.totals.views}
            icon={Eye}
            variant="purple"
            subtitle="page views"
          />
          <ListingStatCard
            title="Open Rate"
            value={analytics.totals.openRate}
            icon={TrendingUp}
            variant="orange"
            subtitle="of subscribers"
            decimals={1}
          />
        </div>
      )}

      {/* Engagement Trend Chart */}
      {analytics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Over Time</h3>
          {analytics.dailyTrend.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No engagement data for selected period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                />
                <Legend />
                <Line type="monotone" dataKey="opens" stroke="#ed6437" strokeWidth={2} dot={{ fill: '#ed6437', r: 3 }} name="Opens" />
                <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} name="Clicks" />
                <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="Views" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Two-column: Top Links + Subscriber Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clicked Links */}
        {analytics && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clicked Links</h3>
            {analytics.topLinks.length === 0 ? (
              <p className="text-gray-500 text-sm">No click data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topLinks.map((link, idx) => {
                  const totalClicks = analytics.topLinks.reduce((s, l) => s + l.clicks, 0);
                  const pct = totalClicks > 0 ? Math.round((link.clicks / totalClicks) * 100) : 0;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block"
                        >
                          {link.url}
                          <ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#ed6437] h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-16 text-right">
                          {link.clicks} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Subscriber Growth Chart */}
        {subscriberGrowth && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscriber Growth</h3>
            <div className="flex gap-4 text-sm text-gray-600 mb-4">
              <span>Active: <strong className="text-green-700">{subscriberGrowth.totals.active}</strong></span>
              <span>Pending: <strong className="text-yellow-700">{subscriberGrowth.totals.pending}</strong></span>
              <span>Unsubscribed: <strong className="text-red-700">{subscriberGrowth.totals.unsubscribed}</strong></span>
            </div>
            {subscriberGrowth.daily.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-500">
                No subscriber activity for selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={subscriberGrowth.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="subscribed" stroke="#22c55e" fill="#dcfce7" name="Subscribed" />
                  <Area type="monotone" dataKey="unsubscribed" stroke="#ef4444" fill="#fee2e2" name="Unsubscribed" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

      {/* Delivery History Table */}
      {deliveryStats && deliveryStats.newsletters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery History</h3>
          <div className="text-sm text-gray-600 mb-4">
            Average Open Rate: <strong>{deliveryStats.avgOpenRate}%</strong> · Average Click Rate: <strong>{deliveryStats.avgClickRate}%</strong>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-600">Newsletter</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Sent</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Subscribers</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Opens</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Clicks</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Open Rate</th>
                  <th className="pb-3 font-medium text-gray-600 text-right">Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {deliveryStats.newsletters.map((nl) => (
                  <tr key={nl.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{nl.title}</td>
                    <td className="py-3 text-right text-gray-600">
                      {new Date(nl.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 text-right text-gray-600">{nl.subscriberCountAtSend}</td>
                    <td className="py-3 text-right text-gray-600">{nl.openCount}</td>
                    <td className="py-3 text-right text-gray-600">{nl.clickCount}</td>
                    <td className="py-3 text-right text-gray-600">{nl.openRate}%</td>
                    <td className="py-3 text-right text-gray-600">{nl.clickRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function NewsletterAnalyticsDashboard(props: NewsletterAnalyticsDashboardProps) {
  return (
    <ErrorBoundary componentName="NewsletterAnalyticsDashboard">
      <NewsletterAnalyticsDashboardContent {...props} />
    </ErrorBoundary>
  );
}

export default NewsletterAnalyticsDashboard;
