/**
 * JobsKPIDashboard - Platform-wide jobs success metrics dashboard
 *
 * Aggregates 14 KPIs from Feature Map Section 18 into stat panels:
 * - Summary cards (total jobs, applications, avg time-to-fill, view→apply rate)
 * - Conversion metrics panel
 * - Engagement panel
 * - Community & features panel
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8B - KPI Dashboard
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_8_PLAN.md
 * @canon EventsKPIDashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminStatsPanel } from '@/components/admin/shared/AdminStatsPanel';
import { RefreshCw, Loader2, AlertCircle, Briefcase, Users, Clock, TrendingUp } from 'lucide-react';

interface JobKPIStats {
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_hires: number;
  avg_applications_per_job: number | null;
  avg_time_to_fill_days: number | null;
  view_to_apply_rate: number | null;
  total_impressions: number;
  total_page_views: number;
  total_shares: number;
  share_to_click_rate: number | null;
  community_gig_count: number;
  featured_jobs: number;
  alert_subscribers: number;
  not_tracked: string[];
}

interface JobsKPIDashboardProps {
  className?: string;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'Not yet tracked';
  return `${value}%`;
}

function formatNumber(value: number | null): string {
  if (value === null) return 'Not yet tracked';
  return value.toLocaleString();
}

function JobsKPIDashboardContent({ className }: JobsKPIDashboardProps) {
  const [kpi, setKpi] = useState<JobKPIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchKPI = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/jobs/kpi', {
        credentials: 'include',
      });
      if (!res.ok) {
        setError('Failed to load KPI data');
        return;
      }
      const data = await res.json();
      setKpi(data?.data ?? null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError('Failed to load KPI data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/jobs/kpi', {
          credentials: 'include',
        });
        if (cancelled) return;
        if (!res.ok) {
          setError('Failed to load KPI data');
          return;
        }
        const data = await res.json();
        setKpi(data?.data ?? null);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch {
        if (!cancelled) setError('Failed to load KPI data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (error && !kpi) {
    return (
      <div className={`bg-white rounded-xl border border-red-200 p-8 text-center ${className ?? ''}`}>
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-700 font-medium mb-3">{error}</p>
        <button
          onClick={fetchKPI}
          className="px-4 py-2 bg-biz-orange text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-biz-navy">Jobs KPI Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">Last updated: {lastUpdated}</p>
          )}
        </div>
        <button
          onClick={fetchKPI}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {isLoading && !kpi ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : kpi ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Briefcase className="w-4 h-4" />
                Total Jobs
              </div>
              <div className="text-2xl font-bold text-biz-navy">{kpi.total_jobs.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                Applications
              </div>
              <div className="text-2xl font-bold text-biz-navy">{kpi.total_applications.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4" />
                Avg Time-to-Fill
              </div>
              <div className="text-2xl font-bold text-biz-navy">
                {kpi.avg_time_to_fill_days !== null ? `${kpi.avg_time_to_fill_days} days` : 'N/A'}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                View→Apply Rate
              </div>
              <div className="text-2xl font-bold text-biz-navy">{formatPercent(kpi.view_to_apply_rate)}</div>
            </div>
          </div>

          {/* Conversion Metrics */}
          <AdminStatsPanel
            title="Conversion Metrics"
            sections={[
              {
                title: 'Applications',
                items: [
                  { label: 'Avg/Active Job', value: kpi.avg_applications_per_job !== null ? String(kpi.avg_applications_per_job) : 'N/A', bold: true },
                  { label: 'Total Applications', value: formatNumber(kpi.total_applications) },
                ],
              },
              {
                title: 'Hiring',
                items: [
                  { label: 'Total Hires', value: formatNumber(kpi.total_hires), bold: true },
                  { label: 'Avg Time-to-Fill', value: kpi.avg_time_to_fill_days !== null ? `${kpi.avg_time_to_fill_days} days` : 'N/A' },
                ],
              },
              {
                title: 'Funnel',
                items: [
                  { label: 'View→Apply Rate', value: formatPercent(kpi.view_to_apply_rate), bold: true },
                ],
              },
            ]}
          />

          {/* Engagement */}
          <AdminStatsPanel
            title="Engagement"
            sections={[
              {
                title: 'Views',
                items: [
                  { label: 'Impressions', value: formatNumber(kpi.total_impressions), bold: true },
                  { label: 'Page Views', value: formatNumber(kpi.total_page_views) },
                ],
              },
              {
                title: 'Shares',
                items: [
                  { label: 'Total Shares', value: formatNumber(kpi.total_shares) },
                  { label: 'Click-Through Rate', value: formatPercent(kpi.share_to_click_rate) },
                ],
              },
            ]}
          />

          {/* Community & Features */}
          <AdminStatsPanel
            title="Community & Features"
            sections={[
              {
                title: 'Community',
                items: [
                  { label: 'Community Gigs', value: formatNumber(kpi.community_gig_count), bold: true },
                ],
              },
              {
                title: 'Features',
                items: [
                  { label: 'Featured Jobs', value: formatNumber(kpi.featured_jobs), bold: true },
                  { label: 'Alert Subscribers', value: formatNumber(kpi.alert_subscribers) },
                ],
              },
              {
                title: 'Not Yet Tracked',
                items: kpi.not_tracked.length > 0
                  ? kpi.not_tracked.slice(0, 3).map(k => ({
                      label: k.replace(/_/g, ' '),
                      value: 'N/A',
                    }))
                  : [{ label: 'All tracked', value: '-' }],
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

export function JobsKPIDashboard(props: JobsKPIDashboardProps) {
  return (
    <ErrorBoundary>
      <JobsKPIDashboardContent {...props} />
    </ErrorBoundary>
  );
}
