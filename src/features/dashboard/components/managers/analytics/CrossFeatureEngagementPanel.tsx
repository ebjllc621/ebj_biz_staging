/**
 * CrossFeatureEngagementPanel - Cross-Entity Engagement Attribution
 *
 * @description Shows sub-entity counts (events, jobs, offers) for a listing
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5A - Cross-Feature Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5A_BRAIN_PLAN.md
 * @reference src/features/events/components/admin/EventsKPIDashboard.tsx
 *
 * Rendered in AnalyticsManager after existing analytics charts.
 * Receives subEntityCounts from the parent's data fetch to avoid duplicate API calls.
 */
'use client';

import React from 'react';
import { Calendar, Briefcase, Tag, TrendingUp } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ============================================================================
// Types
// ============================================================================

export interface CrossFeatureEngagementPanelProps {
  subEntityCounts: {
    eventCount: number;
    jobCount: number;
    offerCount: number;
  };
  isLoading?: boolean;
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatBar({
  label,
  count,
  icon: Icon,
  color
}: {
  label: string;
  count: number;
  icon: typeof Calendar;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
      </div>
      {count > 0 && (
        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          Active
        </span>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Content Component
// ============================================================================

function CrossFeatureEngagementPanelContent({
  subEntityCounts,
  isLoading = false
}: CrossFeatureEngagementPanelProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const { eventCount, jobCount, offerCount } = subEntityCounts;
  const totalSubEntities = eventCount + jobCount + offerCount;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#ed6437]" />
        <h3 className="text-lg font-semibold text-gray-900">Cross-Feature Activity</h3>
      </div>

      {totalSubEntities === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No cross-feature activity yet.</p>
          <p className="text-xs mt-1">
            Add events, jobs, or offers to see engagement data here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StatBar
              label="Active Events"
              count={eventCount}
              icon={Calendar}
              color="text-orange-600 bg-orange-100"
            />
            <StatBar
              label="Active Jobs"
              count={jobCount}
              icon={Briefcase}
              color="text-blue-600 bg-blue-100"
            />
            <StatBar
              label="Active Offers"
              count={offerCount}
              icon={Tag}
              color="text-green-600 bg-green-100"
            />
          </div>

          <p className="text-sm text-gray-500">
            Your listing has {totalSubEntities} active sub-feature
            {totalSubEntities > 1 ? 's' : ''}.{' '}
            {totalSubEntities >= 3
              ? 'Great cross-feature presence!'
              : 'Adding more features can increase engagement by up to 15%.'}
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Exported Component (ErrorBoundary wrapped — STANDARD tier requirement)
// ============================================================================

export function CrossFeatureEngagementPanel(props: CrossFeatureEngagementPanelProps) {
  return (
    <ErrorBoundary componentName="CrossFeatureEngagementPanel">
      <CrossFeatureEngagementPanelContent {...props} />
    </ErrorBoundary>
  );
}

export default CrossFeatureEngagementPanel;
