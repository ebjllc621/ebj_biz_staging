/**
 * Admin Events Analytics (KPI Dashboard) Page
 *
 * Route: /admin/events/analytics
 * Displays platform-wide event success metrics (FM Section 17)
 *
 * @phase Phase 8 - Polish + KPI Dashboard
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_8_PLAN.md
 * @tier STANDARD
 */

import { EventsKPIDashboard } from '@features/events/components/admin/EventsKPIDashboard';

export default function AdminEventsAnalyticsPage() {
  return (
    <div className="p-6">
      <EventsKPIDashboard />
    </div>
  );
}
