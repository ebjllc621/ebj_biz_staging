/**
 * Event Co-Hosts Dashboard Page
 * /dashboard/listings/[listingId]/events/co-hosts
 *
 * @description Manage co-hosts for a listing's events
 * @component Server Component (wraps client EventCoHostManager)
 * @tier STANDARD
 * @phase Phase 6A - Co-Host System
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_6A_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventCoHostManager } from '@features/events/components/dashboard/EventCoHostManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventCoHostsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Co-Hosts"
      description="Manage co-hosts for your events"
      featureId="events"
    >
      <EventCoHostManager listingId={parseInt(listingId)} />
    </ListingManagerTemplate>
  );
}
