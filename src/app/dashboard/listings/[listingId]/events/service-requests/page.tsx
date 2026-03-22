/**
 * Event Service Requests Dashboard Page
 * /dashboard/listings/[listingId]/events/service-requests
 *
 * @description Manage service procurement requests for a listing's events
 * @component Server Component (wraps client EventServiceRequestManager)
 * @tier STANDARD
 * @phase Phase 6C - Service Procurement (Quote Integration)
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_6C_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventServiceRequestManager } from '@features/events/components/dashboard/EventServiceRequestManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventServiceRequestsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Event Service Requests"
      description="Procure services for your events — catering, AV, security, and more (Preferred/Premium)"
      featureId="events"
    >
      <EventServiceRequestManager listingId={parseInt(listingId)} />
    </ListingManagerTemplate>
  );
}
