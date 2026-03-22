/**
 * Events Manager Page - /dashboard/listings/[listingId]/events
 *
 * @description Manage events for a listing
 * @component Server Component (imports client EventsManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventsManager } from '@features/dashboard/components/managers/EventsManager';

export default function EventsPage() {
  return (
    <ListingManagerTemplate
      title="Events"
      description="Manage your listing's events and activities"
      featureId="events"
    >
      <EventsManager />
    </ListingManagerTemplate>
  );
}
