/**
 * CampaignSection - Promotional Content for Listings Page
 *
 * Displays featured offers, upcoming events, and optionally featured listings
 * using the canonical ContentSlider pattern.
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @authority Build Map v2.1 ENHANCED
 */
'use client';

import { Gift, Calendar } from 'lucide-react';
import { ContentSlider } from '@features/homepage/components/ContentSlider';
import { OfferCard } from '@features/homepage/components/OfferCard';
import { EventCard } from '@features/homepage/components/EventCard';
import { useCampaignData } from '../hooks/useCampaignData';

interface CampaignSectionProps {
  /** Additional CSS classes */
  className?: string;
  /** Maximum items per section (applies to both if individual not set) */
  maxItems?: number;
  /** Maximum offers to display (overrides maxItems for offers) */
  maxOffers?: number;
  /** Maximum events to display (overrides maxItems for events) */
  maxEvents?: number;
  /** Category slug to filter offers/events by listing category */
  category?: string;
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

export function CampaignSection({
  className = '',
  maxItems = 5,
  maxOffers,
  maxEvents,
  category
}: CampaignSectionProps) {
  const { offers, events, isLoading, error } = useCampaignData({ category });

  // Individual limits override the shared maxItems default
  const offersLimit = maxOffers ?? maxItems;
  const eventsLimit = maxEvents ?? maxItems;

  if (error) {
    return null; // Silent fail - campaigns are supplementary
  }

  const hasOffers = offers && offers.length > 0;
  const hasEvents = events && events.length > 0;

  if (!isLoading && !hasOffers && !hasEvents) {
    return null; // No content to display
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Offers Section */}
      {isLoading ? (
        <SectionSkeleton />
      ) : hasOffers ? (
        <ContentSlider title="Featured Offers" icon={Gift} moreLink="/offers" showArrows={true}>
          {offers.slice(0, offersLimit).map(offer => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </ContentSlider>
      ) : null}

      {/* Events Section */}
      {isLoading ? (
        <SectionSkeleton />
      ) : hasEvents ? (
        <ContentSlider title="Upcoming Events" icon={Calendar} moreLink="/events" showArrows={true}>
          {events.slice(0, eventsLimit).map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </ContentSlider>
      ) : null}
    </div>
  );
}

export default CampaignSection;
