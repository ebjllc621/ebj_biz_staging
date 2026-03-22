/**
 * Event Sponsors Dashboard Page
 * /dashboard/listings/[listingId]/events/sponsors
 *
 * @description Manage sponsors for a listing's events
 * @component Server Component (wraps client EventSponsorManager)
 * @tier STANDARD
 * @phase Phase 5 - Task 5.12: Dashboard Sponsor Page
 * @authority docs/pages/layouts/events/build/phases/PHASE_5_SPONSORS_SYSTEM.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventSponsorManager } from '@features/events/components/dashboard/EventSponsorManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventSponsorsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Event Sponsors"
      description="Manage sponsors for your events"
      featureId="events"
    >
      <EventSponsorManager listingId={parseInt(listingId)} />
    </ListingManagerTemplate>
  );
}
