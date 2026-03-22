/**
 * ContactAnalyticsDashboard - Contact analytics dashboard
 *
 * @component Client Component
 * @tier ADVANCED (ErrorBoundary Required)
 * @phase Contacts Phase E
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Advanced analytics dashboard with charts and metrics
 * Displays contact statistics, distributions, and growth trends
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { Users, Star, Archive, Tag, TrendingUp, Clock, Loader2 } from 'lucide-react';
import type { ContactAnalytics, AnalyticsDateRange } from '../types';
import { AnalyticsChart } from './AnalyticsChart';
import { ReferralAnalytics } from './ReferralAnalytics';

interface ContactAnalyticsDashboardProps {
  /** Date range for analytics */
  dateRange?: AnalyticsDateRange;
}

/**
 * Stat card component
 */
function StatCard({ icon: Icon, label, value, color = 'blue' }: {
  icon: any;
  label: string;
  value: number | string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${colorClasses[color] || colorClasses.blue} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Distribution bar component
 */
function DistributionBar({ label, value, total, color }: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * ContactAnalyticsDashboard component
 * ADVANCED tier - requires ErrorBoundary wrapper
 */
export function ContactAnalyticsDashboard({
  dateRange = '30d'
}: ContactAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ContactAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<AnalyticsDateRange>(dateRange);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/contacts/analytics?dateRange=${selectedRange}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      // FIX: Handle createSuccessResponse envelope pattern
      // API returns: { success: true, data: { analytics: {...}, date_range: '...' } }
      const analyticsData = result.data?.analytics || result.analytics;

      if (!analyticsData) {
        throw new Error('Invalid analytics response format');
      }

      setAnalytics(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <select
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value as AnalyticsDateRange)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Contacts"
          value={analytics.totalContacts}
          color="blue"
        />
        <StatCard
          icon={Star}
          label="Starred"
          value={analytics.starredContacts}
          color="yellow"
        />
        <StatCard
          icon={Clock}
          label="Upcoming Reminders"
          value={analytics.upcomingReminders}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="With Notes"
          value={analytics.contactsWithNotes}
          color="purple"
        />
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Category</h3>
          <div className="space-y-4">
            {analytics.categoryDistribution.map((item) => (
              <DistributionBar
                key={item.category}
                label={item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                value={item.count}
                total={analytics.totalContacts}
                color="bg-blue-500"
              />
            ))}
          </div>
        </div>

        {/* Source Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Source</h3>
          <div className="space-y-4">
            {analytics.sourceDistribution.map((item) => (
              <DistributionBar
                key={item.source}
                label={item.source.charAt(0).toUpperCase() + item.source.slice(1).replace('_', ' ')}
                value={item.count}
                total={analytics.totalContacts}
                color="bg-green-500"
              />
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">By Priority</h3>
          <div className="space-y-4">
            {analytics.priorityDistribution.map((item) => (
              <DistributionBar
                key={item.priority}
                label={item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                value={item.count}
                total={analytics.totalContacts}
                color={item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'}
              />
            ))}
          </div>
        </div>

        {/* Top Tags */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Tags</h3>
          {analytics.topTags.length > 0 ? (
            <div className="space-y-4">
              {analytics.topTags.slice(0, 5).map((item) => (
                <DistributionBar
                  key={item.tag}
                  label={item.tag}
                  value={item.count}
                  total={analytics.totalContacts}
                  color="bg-purple-500"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tags yet</p>
          )}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Contacts with Notes</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.contactsWithNotes}</p>
            <p className="text-xs text-gray-500">
              {analytics.totalContacts > 0 ? Math.round((analytics.contactsWithNotes / analytics.totalContacts) * 100) : 0}% of total
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Contacts with Tags</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.contactsWithTags}</p>
            <p className="text-xs text-gray-500">
              Avg {analytics.averageTagsPerContact.toFixed(1)} tags per contact
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Overdue Reminders</p>
            <p className="text-2xl font-bold text-red-600">{analytics.overdueReminders}</p>
            <p className="text-xs text-gray-500">Needs attention</p>
          </div>
        </div>
      </div>

      {/* Contact Growth Chart */}
      {analytics.contactGrowth && analytics.contactGrowth.length > 0 && (
        <AnalyticsChart
          type="trend"
          title="Contact Growth"
          trendData={analytics.contactGrowth.map(g => ({
            date: g.date,
            value: g.newContacts
          }))}
          height="md"
        />
      )}

      {/* Referral Analytics Section (Phase 3-4 Integration) */}
      <ReferralAnalytics />
    </div>
  );
}

export default ContactAnalyticsDashboard;
