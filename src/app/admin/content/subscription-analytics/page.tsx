'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@core/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Users, Heart, TrendingUp, Bell } from 'lucide-react';

interface FollowTypeData {
  followType: string;
  count: number;
}

interface FrequencyData {
  frequency: string;
  count: number;
}

interface TopListingData {
  listingId: number;
  name: string;
  count: number;
}

interface GrowthData {
  date: string;
  count: number;
}

interface SubscriptionStatistics {
  totalFollows: number;
  totalActiveFollows: number;
  uniqueFollowers: number;
  followsByType: FollowTypeData[];
  followsByFrequency: FrequencyData[];
  topFollowedListings: TopListingData[];
  growthTrend: GrowthData[];
  unfollowTrend: GrowthData[];
}

function SubscriptionAnalyticsContent() {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<SubscriptionStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('30d');

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/analytics/subscriptions?range=${range}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load subscription analytics');
      const result = await response.json();
      if (!result.success || !result.data?.statistics) {
        throw new Error(result.error?.message || 'Failed to load statistics');
      }
      setStatistics(result.data.statistics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStatistics();
    }
  }, [user, fetchStatistics]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-600">
        Admin access required.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchStatistics}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) return null;

  const activePercentage = statistics.totalFollows > 0
    ? Math.round((statistics.totalActiveFollows / statistics.totalFollows) * 100)
    : 0;

  const topType = statistics.followsByType.length > 0
    ? statistics.followsByType.reduce((a, b) => a.count > b.count ? a : b)
    : null;

  const topFrequency = statistics.followsByFrequency.length > 0
    ? statistics.followsByFrequency.reduce((a, b) => a.count > b.count ? a : b)
    : null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Analytics</h1>
          <p className="text-gray-600 mt-1">Content follow and subscription statistics</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-5 w-5 text-biz-orange" />
            <span className="text-sm font-medium text-gray-600">Active Follows</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics.totalActiveFollows.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{activePercentage}% of total</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Unique Followers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics.uniqueFollowers.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Most Popular Type</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{topType?.followType || 'N/A'}</p>
          {topType && <p className="text-xs text-gray-500 mt-1">{topType.count} follows</p>}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Preferred Frequency</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{topFrequency?.frequency || 'N/A'}</p>
          {topFrequency && <p className="text-xs text-gray-500 mt-1">{topFrequency.count} users</p>}
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Follow Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Follow Type Distribution</h2>
          </div>
          <div className="p-5">
            {statistics.followsByType.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No follow data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Count</th>
                    <th className="pb-2 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.followsByType.map((item) => (
                    <tr key={item.followType} className="border-b last:border-0">
                      <td className="py-2 capitalize">{item.followType.replace(/_/g, ' ')}</td>
                      <td className="py-2 text-right">{item.count.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-500">
                        {statistics.totalActiveFollows > 0
                          ? Math.round((item.count / statistics.totalActiveFollows) * 100)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Frequency Distribution */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Notification Frequency</h2>
          </div>
          <div className="p-5">
            {statistics.followsByFrequency.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No frequency data yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="pb-2 font-medium">Frequency</th>
                    <th className="pb-2 font-medium text-right">Count</th>
                    <th className="pb-2 font-medium text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.followsByFrequency.map((item) => (
                    <tr key={item.frequency} className="border-b last:border-0">
                      <td className="py-2 capitalize">{item.frequency}</td>
                      <td className="py-2 text-right">{item.count.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-500">
                        {statistics.totalActiveFollows > 0
                          ? Math.round((item.count / statistics.totalActiveFollows) * 100)
                          : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Top Followed Listings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Top Followed Listings</h2>
        </div>
        <div className="p-5">
          {statistics.topFollowedListings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No listing follow data yet</p>
          ) : (
            <div className="space-y-3">
              {statistics.topFollowedListings.map((listing, index) => (
                <div key={listing.listingId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900">{listing.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{listing.count.toLocaleString()} followers</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionAnalyticsPage() {
  return (
    <ErrorBoundary componentName="SubscriptionAnalyticsPage">
      <SubscriptionAnalyticsContent />
    </ErrorBoundary>
  );
}
