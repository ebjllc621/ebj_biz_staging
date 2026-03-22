/**
 * Admin Listing Analytics Page
 *
 * Route: /admin/listings/analytics
 * Displays platform-wide listing analytics (Phase 5B)
 *
 * @phase Phase 5B - Advanced Analytics
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5B_BRAIN_PLAN.md
 * @reference src/app/admin/events/analytics/page.tsx — canonical admin analytics page shell
 * @tier STANDARD
 */

import { AdminListingAnalytics } from '@features/listings/components/admin/AdminListingAnalytics';

export default function AdminListingAnalyticsPage() {
  return (
    <div className="p-6">
      <AdminListingAnalytics />
    </div>
  );
}
