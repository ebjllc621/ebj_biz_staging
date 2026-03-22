/**
 * Event Exhibitors Dashboard Page
 * /dashboard/listings/[listingId]/events/exhibitors
 *
 * @description Manage exhibitors for a listing's events
 * @component Server Component (wraps client EventExhibitorManager)
 * @tier STANDARD
 * @phase Phase 6B - Exhibitor System
 * @authority docs/pages/layouts/integrationPointRef/events/phases/PHASE_6B_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventExhibitorManager } from '@features/events/components/dashboard/EventExhibitorManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventExhibitorsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Event Exhibitors"
      description="Manage exhibitors for your events"
      featureId="events"
    >
      <EventExhibitorManager listingId={parseInt(listingId)} />
    </ListingManagerTemplate>
  );
}
