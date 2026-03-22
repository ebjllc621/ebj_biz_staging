/**
 * Dashboard Jobs Page
 *
 * @route /dashboard/jobs
 * @tier STANDARD
 * @phase Jobs Phase 3 - Dashboard Completion
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_3_PLAN.md
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MyJobsSection } from '@features/jobs/components/dashboard/MyJobsSection';

function JobsPageContent() {
  return (
    <div className="space-y-6">
      <MyJobsSection />
    </div>
  );
}

export default function JobSearchDashboardPage() {
  return (
    <ErrorBoundary componentName="JobSearchDashboard">
      <JobsPageContent />
    </ErrorBoundary>
  );
}
