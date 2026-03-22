/**
 * Event Attendees Dashboard Page
 * /dashboard/listings/[listingId]/events/attendees
 *
 * @description Manage RSVPs, waitlists, and attendee data for your events
 * @component Server Component (wraps client EventAttendeeManager)
 * @tier STANDARD
 * @phase Phase 3 - Gap G7/G22: RSVP & Attendee Management
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_3_RSVP_ATTENDEE_MANAGEMENT.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventAttendeeManager } from '@features/events/components/dashboard/EventAttendeeManager';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventAttendeesPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Event Attendees"
      description="Manage RSVPs, waitlists, and attendee data for your events"
      featureId="events"
    >
      <EventAttendeeManager listingId={listingId} />
    </ListingManagerTemplate>
  );
}
