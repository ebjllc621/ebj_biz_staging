/**
 * EventsKPIDashboard - Platform-wide events success metrics dashboard
 *
 * Aggregates 14 KPIs from Feature Map Section 17 into stat panels:
 * - Summary cards (total events, RSVP rate, share rate, revenue)
 * - Conversion metrics panel
 * - Growth & activity panel
 * - Organizer workflow panel
 * - Existing AdminOrganizerOverview at bottom
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8 - Polish + KPI Dashboard (FM Section 17)
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminStatsPanel } from '@/components/admin/shared/AdminStatsPanel';
import { AdminOrganizerOverview } from '@/components/admin/AdminOrganizerOverview';
import { RefreshCw, Loader2, AlertCircle, TrendingUp, DollarSign, Share2, Users } from 'lucide-react';
import type { EventKPIStats } from '@features/events/types';

interface EventsKPIDashboardProps {
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

function formatCurrency(value: number | null): string {
  if (value === null) return 'Not yet tracked';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EventsKPIDashboardContent({ className }: EventsKPIDashboardProps) {
  const [kpi, setKpi] = useState<EventKPIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchKPI = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/events/kpi', {
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
        const res = await fetch('/api/admin/events/kpi', {
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
          <h1 className="text-2xl font-bold text-biz-navy">Events KPI Dashboard</h1>
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
                <TrendingUp className="w-4 h-4" />
                Total Events
              </div>
              <div className="text-2xl font-bold text-biz-navy">{kpi.total_events.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                RSVP Rate
              </div>
              <div className="text-2xl font-bold text-biz-navy">{formatPercent(kpi.event_to_rsvp_rate)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Share2 className="w-4 h-4" />
                Share Rate
              </div>
              <div className="text-2xl font-bold text-biz-navy">{formatPercent(kpi.post_publish_share_rate)}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <DollarSign className="w-4 h-4" />
                Ticket Revenue
              </div>
              <div className="text-2xl font-bold text-biz-navy">{formatCurrency(kpi.ticket_revenue_total)}</div>
            </div>
          </div>

          {/* Conversion Metrics */}
          <AdminStatsPanel
            title="Conversion Metrics"
            sections={[
              {
                title: 'View → RSVP',
                items: [
                  { label: 'Conversion Rate', value: formatPercent(kpi.event_to_rsvp_rate), bold: true },
                  { label: 'Total RSVPs', value: formatNumber(kpi.total_rsvps) },
                ],
              },
              {
                title: 'RSVP → Attendance',
                items: [
                  { label: 'Check-In Rate', value: formatPercent(kpi.rsvp_to_attendance_rate), bold: true },
                ],
              },
              {
                title: 'Post-Event',
                items: [
                  { label: 'Review Rate', value: formatPercent(kpi.post_event_review_rate), bold: true },
                ],
              },
            ]}
          />

          {/* Growth & Activity */}
          <AdminStatsPanel
            title="Growth & Activity"
            sections={[
              {
                title: 'Events',
                items: [
                  { label: 'Avg/Business', value: kpi.avg_events_per_business !== null ? String(kpi.avg_events_per_business) : 'N/A', bold: true },
                  { label: 'Total Shares', value: formatNumber(kpi.total_shares) },
                ],
              },
              {
                title: 'Engagement',
                items: [
                  { label: 'Share Rate', value: formatPercent(kpi.post_publish_share_rate) },
                  { label: 'Followers', value: formatNumber(kpi.notification_subscription_rate) },
                ],
              },
              {
                title: 'Community',
                items: [
                  { label: 'Submissions/Month', value: formatNumber(kpi.community_submissions_per_month), bold: true },
                ],
              },
            ]}
          />

          {/* Organizer Workflow */}
          <AdminStatsPanel
            title="Organizer Workflow"
            sections={[
              {
                title: 'Vendor Acceptance',
                items: [
                  { label: 'Accept Rate', value: formatPercent(kpi.vendor_acceptance_rate), bold: true },
                ],
              },
              {
                title: 'Revenue',
                items: [
                  { label: 'Ticket Revenue', value: formatCurrency(kpi.ticket_revenue_total), bold: true },
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

          {/* Existing organizer overview */}
          <AdminOrganizerOverview />
        </>
      ) : null}
    </div>
  );
}

export function EventsKPIDashboard(props: EventsKPIDashboardProps) {
  return (
    <ErrorBoundary>
      <EventsKPIDashboardContent {...props} />
    </ErrorBoundary>
  );
}
