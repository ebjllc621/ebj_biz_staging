/**
 * Event Analytics Page - Event Owner Analytics Dashboard
 *
 * Route: /dashboard/listings/[listingId]/events/analytics
 *
 * @tier PAGE
 * @phase Phase 4 - Event Owner Analytics Dashboard
 * @authority docs/pages/layouts/events/build/3-10-26/phases/PHASE_4_EVENT_OWNER_ANALYTICS.md
 *
 * GOVERNANCE RULES:
 * - MUST use ListingManagerTemplate wrapper
 * - MUST use EventAnalyticsManager component
 * - Server Component (no 'use client' needed at page level)
 * - Async params pattern (Next.js 14)
 */

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { EventAnalyticsManager } from '@features/events/components/dashboard/EventAnalyticsManager';

export const metadata = {
  title: 'Event Analytics - Listing Manager',
  description: 'View detailed analytics and performance metrics for your events'
};

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
  searchParams: Promise<{
    eventId?: string;
  }>;
}

export default async function EventAnalyticsPage({ params, searchParams }: PageProps) {
  const { listingId } = await params;
  const { eventId: eventIdParam } = await searchParams;

  const parsedEventId = eventIdParam ? parseInt(eventIdParam, 10) : null;
  const eventId = parsedEventId !== null && !isNaN(parsedEventId) ? parsedEventId : null;

  return (
    <ListingManagerTemplate
      title="Event Analytics"
      description="View detailed performance metrics and engagement insights for your events"
    >
      <EventAnalyticsManager
        listingId={listingId}
        eventId={eventId}
      />
    </ListingManagerTemplate>
  );
}
