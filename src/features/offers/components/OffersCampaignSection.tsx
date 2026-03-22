/**
 * OffersCampaignSection - Promotional Content for Offers Page
 *
 * Displays upcoming events and featured listings using the canonical
 * ContentSlider pattern. Offers are excluded since they're already
 * displayed as the main page content.
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 7 - Campaign Section
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/phases/PHASE_7_BRAIN_PLAN.md
 *
 * @see src/features/events/components/EventsCampaignSection.tsx - Canonical pattern
 */

'use client';

import { Calendar, Building2 } from 'lucide-react';
import { ContentSlider } from '@/features/homepage/components/ContentSlider';
import { EventCard } from '@/features/homepage/components/EventCard';
import { ListingCard } from '@/features/homepage/components/ListingCard';
import { useOfferCampaignData } from '../hooks/useOfferCampaignData';

interface OffersCampaignSectionProps {
  /** Additional CSS classes */
  className?: string;
  /** Maximum items per section (applies to both if individual not set) */
  maxItems?: number;
  /** Maximum events to display (overrides maxItems for events) */
  maxEvents?: number;
  /** Maximum listings to display (overrides maxItems for listings) */
  maxListings?: number;
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72 h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function OffersCampaignSection({
  className = '',
  maxItems = 5,
  maxEvents,
  maxListings
}: OffersCampaignSectionProps) {
  const { events, featuredListings, isLoading, error } = useOfferCampaignData();

  const eventsLimit = maxEvents ?? maxItems;
  const listingsLimit = maxListings ?? maxItems;

  if (error) {
    return null; // Silent fail - campaigns are supplementary
  }

  const hasEvents = events && events.length > 0;
  const hasListings = featuredListings && featuredListings.length > 0;

  if (!isLoading && !hasEvents && !hasListings) {
    return null;
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {isLoading ? (
        <SectionSkeleton />
      ) : hasEvents ? (
        <ContentSlider title="Upcoming Events" icon={Calendar} moreLink="/events" showArrows={true}>
          {events.slice(0, eventsLimit).map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </ContentSlider>
      ) : null}

      {isLoading ? (
        <SectionSkeleton />
      ) : hasListings ? (
        <ContentSlider title="Featured Businesses" icon={Building2} moreLink="/listings" showArrows={true}>
          {featuredListings.slice(0, listingsLimit).map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ContentSlider>
      ) : null}
    </div>
  );
}

export default OffersCampaignSection;
