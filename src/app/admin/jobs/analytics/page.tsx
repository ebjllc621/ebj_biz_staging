/**
 * Admin Jobs Analytics (KPI Dashboard) Page
 *
 * Route: /admin/jobs/analytics
 * Displays platform-wide job success metrics (FM Section 18)
 *
 * @phase Phase 8B - KPI Dashboard
 * @authority docs/pages/layouts/integrationPointRef/jobs/phases/PHASE_8_PLAN.md
 * @tier STANDARD
 */

import { JobsKPIDashboard } from '@features/jobs/components/admin/JobsKPIDashboard';

export default function AdminJobsAnalyticsPage() {
  return (
    <div className="p-6">
      <JobsKPIDashboard />
    </div>
  );
}
