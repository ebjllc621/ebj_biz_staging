/**
 * OrganizerAnalyticsBreakdown - Detailed status breakdown per organizer entity type
 *
 * Three sections with stacked bars:
 * - Co-Hosts: pending/active/declined/removed breakdown
 * - Exhibitors: same breakdown + impressions/clicks analytics
 * - Service Requests: draft/open/in_progress/fulfilled/cancelled breakdown
 *
 * @tier SIMPLE
 * @phase Phase 6D - Organizer Analytics
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import type { OrganizerAnalyticsData } from '@features/events/types';

export interface OrganizerAnalyticsBreakdownProps {
  analytics: OrganizerAnalyticsData;
}

// ============================================================================
// Color palette for stacked bars
// ============================================================================

const COLORS = {
  active: '#22c55e',    // green-500
  fulfilled: '#22c55e', // green-500
  pending: '#eab308',   // yellow-500
  open: '#eab308',      // yellow-500
  in_progress: '#3b82f6', // blue-500
  declined: '#ef4444',  // red-500
  cancelled: '#ef4444', // red-500
  removed: '#9ca3af',   // gray-400
  draft: '#9ca3af',     // gray-400
};

// ============================================================================
// Stacked Bar Component
// ============================================================================

interface SegmentData {
  label: string;
  count: number;
  color: string;
}

function StackedBar({ segments, total }: { segments: SegmentData[]; total: number }) {
  if (total === 0) {
    return (
      <div className="w-full h-4 bg-gray-100 rounded-full">
        <p className="text-xs text-gray-400 text-center mt-1">No data</p>
      </div>
    );
  }

  return (
    <div className="w-full h-4 rounded-full overflow-hidden flex">
      {segments.map((seg, i) => {
        if (seg.count === 0) return null;
        const pct = (seg.count / total) * 100;
        return (
          <div
            key={i}
            style={{ width: `${pct}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${seg.count}`}
            className="h-full transition-all"
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Status Legend Item
// ============================================================================

function LegendItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-600">
        <span className="font-medium">{label}:</span> {count}
      </span>
    </div>
  );
}

// ============================================================================
// Section Container
// ============================================================================

function BreakdownSection({ title, usage, limit, children }: {
  title: string;
  usage: number;
  limit: number;
  children: React.ReactNode;
}) {
  const limitLabel = limit >= 999 ? 'Unlimited' : String(limit);
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {usage} / {limitLabel}
        </span>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrganizerAnalyticsBreakdown({ analytics }: OrganizerAnalyticsBreakdownProps) {
  const { co_hosts, exhibitors, service_requests, tier_limits } = analytics;

  // Co-host stacked bar segments
  const coHostSegments: SegmentData[] = [
    { label: 'Active', count: co_hosts.active, color: COLORS.active },
    { label: 'Pending', count: co_hosts.pending, color: COLORS.pending },
    { label: 'Declined', count: co_hosts.declined, color: COLORS.declined },
    { label: 'Removed', count: co_hosts.removed, color: COLORS.removed },
  ];

  // Exhibitor stacked bar segments
  const exhibitorSegments: SegmentData[] = [
    { label: 'Active', count: exhibitors.active, color: COLORS.active },
    { label: 'Pending', count: exhibitors.pending, color: COLORS.pending },
    { label: 'Declined', count: exhibitors.declined, color: COLORS.declined },
    { label: 'Removed', count: exhibitors.removed, color: COLORS.removed },
  ];

  // Service request stacked bar segments
  const serviceSegments: SegmentData[] = [
    { label: 'Fulfilled', count: service_requests.fulfilled, color: COLORS.fulfilled },
    { label: 'In Progress', count: service_requests.in_progress, color: COLORS.in_progress },
    { label: 'Open', count: service_requests.open, color: COLORS.open },
    { label: 'Draft', count: service_requests.draft, color: COLORS.draft },
    { label: 'Cancelled', count: service_requests.cancelled, color: COLORS.cancelled },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Status Breakdown</h2>

      {/* Co-Hosts Section */}
      <BreakdownSection
        title="Co-Hosts"
        usage={co_hosts.total}
        limit={tier_limits.co_hosts}
      >
        <StackedBar segments={coHostSegments} total={co_hosts.total} />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <LegendItem label="Active" count={co_hosts.active} color={COLORS.active} />
          <LegendItem label="Pending" count={co_hosts.pending} color={COLORS.pending} />
          <LegendItem label="Declined" count={co_hosts.declined} color={COLORS.declined} />
          <LegendItem label="Removed" count={co_hosts.removed} color={COLORS.removed} />
        </div>
        <p className="text-xs text-gray-500">
          Acceptance Rate: <span className="font-semibold text-gray-700">{co_hosts.acceptance_rate.toFixed(1)}%</span>
        </p>
      </BreakdownSection>

      {/* Exhibitors Section */}
      <BreakdownSection
        title="Exhibitors"
        usage={exhibitors.total}
        limit={tier_limits.exhibitors}
      >
        <StackedBar segments={exhibitorSegments} total={exhibitors.total} />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <LegendItem label="Active" count={exhibitors.active} color={COLORS.active} />
          <LegendItem label="Pending" count={exhibitors.pending} color={COLORS.pending} />
          <LegendItem label="Declined" count={exhibitors.declined} color={COLORS.declined} />
          <LegendItem label="Removed" count={exhibitors.removed} color={COLORS.removed} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Impressions: <span className="font-semibold text-gray-700">{exhibitors.total_impressions.toLocaleString()}</span></span>
          <span>&middot;</span>
          <span>Clicks: <span className="font-semibold text-gray-700">{exhibitors.total_clicks.toLocaleString()}</span></span>
          <span>&middot;</span>
          <span>CTR: <span className="font-semibold text-gray-700">{exhibitors.click_through_rate.toFixed(1)}%</span></span>
          <span>&middot;</span>
          <span>Acceptance: <span className="font-semibold text-gray-700">{exhibitors.acceptance_rate.toFixed(1)}%</span></span>
        </div>
      </BreakdownSection>

      {/* Service Requests Section */}
      <BreakdownSection
        title="Service Requests"
        usage={service_requests.total}
        limit={tier_limits.service_requests}
      >
        <StackedBar segments={serviceSegments} total={service_requests.total} />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <LegendItem label="Fulfilled" count={service_requests.fulfilled} color={COLORS.fulfilled} />
          <LegendItem label="In Progress" count={service_requests.in_progress} color={COLORS.in_progress} />
          <LegendItem label="Open" count={service_requests.open} color={COLORS.open} />
          <LegendItem label="Draft" count={service_requests.draft} color={COLORS.draft} />
          <LegendItem label="Cancelled" count={service_requests.cancelled} color={COLORS.cancelled} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Fulfillment Rate: <span className="font-semibold text-gray-700">{service_requests.fulfillment_rate.toFixed(1)}%</span></span>
          <span>&middot;</span>
          <span>Avg Responses/Request: <span className="font-semibold text-gray-700">{service_requests.avg_responses_per_request.toFixed(1)}</span></span>
        </div>
      </BreakdownSection>
    </div>
  );
}

export default OrganizerAnalyticsBreakdown;
