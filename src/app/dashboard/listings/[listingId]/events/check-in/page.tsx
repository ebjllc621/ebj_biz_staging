/**
 * Event Check-In Dashboard Page
 * /dashboard/listings/[listingId]/events/check-in
 *
 * @description QR and manual check-in management for a listing's events
 * @component Server Component (wraps client EventCheckInManager)
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @authority docs/pages/layouts/integrationPointRef/events/MASTER_INDEX_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventCheckInManager } from '@features/events/components/dashboard/EventCheckInManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventCheckInPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Check-In"
      description="Manage event check-ins with QR codes or manual verification"
      featureId="events"
    >
      <EventCheckInManager listingId={listingId} />
    </ListingManagerTemplate>
  );
}
