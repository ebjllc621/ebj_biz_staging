/**
 * Event Ticket Sales Dashboard Page
 * /dashboard/listings/[listingId]/events/ticket-sales
 *
 * @description View ticket sales reports for a listing's events
 * @component Server Component (wraps client EventTicketSalesReport)
 * @tier STANDARD
 * @phase Phase 5 - Native Ticketing
 * @authority docs/pages/layouts/integrationPointRef/events/MASTER_INDEX_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import EventTicketSalesReport from '@features/events/components/dashboard/EventTicketSalesReport';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function EventTicketSalesPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Ticket Sales"
      description="View ticket sales and revenue for your events"
      featureId="events"
    >
      <EventTicketSalesReport listingId={listingId} />
    </ListingManagerTemplate>
  );
}
