/**
 * Admin Content Analytics Page
 * Route: /admin/content/analytics
 *
 * @phase Content Phase 4B - Admin Content Analytics
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_4B_ADMIN_CONTENT_ANALYTICS.md
 * @reference src/app/admin/listings/analytics/page.tsx — canonical admin analytics page shell
 * @tier STANDARD
 */

import { ContentAnalyticsDashboard } from '@features/content/components/admin/ContentAnalyticsDashboard';

export default function AdminContentAnalyticsPage() {
  return (
    <div className="p-6">
      <ContentAnalyticsDashboard />
    </div>
  );
}
