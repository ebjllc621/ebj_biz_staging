/**
 * EventDetailSidebar - Business Information Sidebar for Event Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase 1 - Event Detail Page Core
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Business logo and name header
 * - Star rating and review count
 * - Quick contact card
 * - Location with map embed and Get Directions
 * - Business hours
 * - Other upcoming events at this business
 * - Follow Business button
 */
'use client';

import { useEffect, useState } from 'react';
import type { EventDetailData } from '@features/events/types';
import type { Listing } from '@core/services/ListingService';

// Reusable sidebar components from listings
import { SidebarLocationCard } from '@features/listings/components/details/SidebarLocationCard';
import { SidebarHoursCard } from '@features/listings/components/details/SidebarHoursCard';
import { SidebarSocialCard } from '@features/listings/components/details/SidebarSocialCard';

// Event-specific sidebar components
import { EventSidebarBusinessHeader } from './EventSidebarBusinessHeader';
import { EventSidebarOtherEvents } from './EventSidebarOtherEvents';
import { EventSidebarFollowButton } from './EventSidebarFollowButton';
import { EventSidebarQuickContact } from './EventSidebarQuickContact';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface EventDetailSidebarProps {
  /** Event data */
  event: EventDetailData;
  /** Parent listing data (for business info) */
  listing: Listing | null;
}

function EventDetailSidebarContent({ event, listing }: EventDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  // Handle sticky positioning on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If no listing data, show minimal sidebar
  if (!listing) {
    return (
      <aside
        className={`
          ${isSticky ? 'sticky top-4' : ''}
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        `}
      >
        <div className="space-y-4">
          {/* Minimal event info header from event data */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              {event.listing_name || 'Event Host'}
            </h3>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`
        ${isSticky ? 'sticky top-4' : ''}
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
      `}
    >
      <div className="space-y-4">
        {/* Business Header (logo, name, rating) */}
        <EventSidebarBusinessHeader listing={listing} />

        {/* Quick Contact Card */}
        <EventSidebarQuickContact listing={listing} eventId={event.id} />

        {/* Location with Map & Get Directions */}
        <SidebarLocationCard listing={listing} />

        {/* Business Hours */}
        <SidebarHoursCard listing={listing} />

        {/* Social Links */}
        <SidebarSocialCard listing={listing} />

        {/* Other Upcoming Events at This Business */}
        <EventSidebarOtherEvents
          listingId={listing.id}
          currentEventId={event.id}
        />

        {/* Follow Business Button */}
        <EventSidebarFollowButton listing={listing} eventId={event.id} />
      </div>
    </aside>
  );
}

export function EventDetailSidebar(props: EventDetailSidebarProps) {
  return (
    <ErrorBoundary componentName="EventDetailSidebar">
      <EventDetailSidebarContent {...props} />
    </ErrorBoundary>
  );
}

export default EventDetailSidebar;
