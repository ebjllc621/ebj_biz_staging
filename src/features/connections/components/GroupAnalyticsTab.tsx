/**
 * GroupAnalyticsTab
 * Analytics tab for a single group: summary cards, engagement chart, member table, CSV export.
 *
 * @tier STANDARD
 * @phase Phase 4A - Group Analytics, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GroupAnalyticsSummaryCards } from '@features/connections/components/GroupAnalyticsSummaryCards';
import { GroupEngagementChart } from '@features/connections/components/GroupEngagementChart';
import { MemberEngagementTable } from '@features/connections/components/MemberEngagementTable';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';
import type { GroupAnalytics, GroupActivityTimelinePoint, GroupMemberEngagement } from '@features/connections/types/groups';

interface GroupAnalyticsTabProps {
  groupId: number;
}

type DayRange = 7 | 30 | 90;

function GroupAnalyticsTabContent({ groupId }: GroupAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [timeline, setTimeline] = useState<GroupActivityTimelinePoint[]>([]);
  const [engagement, setEngagement] = useState<GroupMemberEngagement[]>([]);
  const [days, setDays] = useState<DayRange>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [analyticsRes, timelineRes, engagementRes] = await Promise.all([
        fetch(`/api/users/connections/groups/${groupId}/analytics`, { credentials: 'include' }),
        fetch(`/api/users/connections/groups/${groupId}/analytics/timeline?days=${days}`, { credentials: 'include' }),
        fetch(`/api/users/connections/groups/${groupId}/analytics/engagement`, { credentials: 'include' })
      ]);

      const [analyticsResult, timelineResult, engagementResult] = await Promise.all([
        analyticsRes.json(),
        timelineRes.json(),
        engagementRes.json()
      ]);

      if (!analyticsResult.success) {
        throw new Error(analyticsResult.error?.message || 'Failed to load analytics');
      }

      setAnalytics(analyticsResult.data.analytics);
      setTimeline(timelineResult.success ? (timelineResult.data.timeline || []) : []);
      setEngagement(engagementResult.success ? (engagementResult.data.engagement || []) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, days]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const csvData = useMemo(() => {
    if (!analytics) return null;
    const rows = [
      ['Metric', 'Value'],
      ['Group Name', analytics.groupName],
      ['Member Count', String(analytics.memberCount)],
      ['Total Messages', String(analytics.totalMessages)],
      ['Total Recommendations', String(analytics.totalRecommendations)],
      ['Accepted Recommendations', String(analytics.acceptedRecommendations)],
      ['Total Activities', String(analytics.totalActivities)],
      ['Engagement Score', String(analytics.engagementScore)],
      ['PYMK Connections Created', String(analytics.pymkConnectionsCreated)],
      ['Points Earned', String(analytics.pointsEarned)]
    ];
    return rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  }, [analytics]);

  const handleExportCsv = useCallback(() => {
    if (!csvData) return;
    const filename = generateTimestampedFilename(`group-${groupId}-analytics`, 'csv');
    downloadFile(csvData, filename, 'text/csv');
  }, [csvData, groupId]);

  const dayOptions: DayRange[] = [7, 30, 90];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {dayOptions.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-colors ${
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Summary Cards - 2-col on mobile, 4-col on md+ */}
      <GroupAnalyticsSummaryCards analytics={analytics} />

      {/* Engagement Chart - full width, stacked naturally */}
      <div className="w-full">
        <GroupEngagementChart timeline={timeline} days={days} />
      </div>

      {/* Member Engagement Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Member Engagement</h3>
        <MemberEngagementTable members={engagement} />
      </div>
    </div>
  );
}

export function GroupAnalyticsTab(props: GroupAnalyticsTabProps) {
  return (
    <ErrorBoundary componentName="GroupAnalyticsTab">
      <GroupAnalyticsTabContent {...props} />
    </ErrorBoundary>
  );
}
