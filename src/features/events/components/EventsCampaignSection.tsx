/**
 * EventsCampaignSection - Promotional Content for Events Page
 *
 * Displays featured offers and featured listings using the canonical
 * ContentSlider pattern. Events are excluded since they're already
 * displayed on the events page.
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @authority Build Map v2.1 ENHANCED
 */
'use client';

import { Gift, Building2 } from 'lucide-react';
import { ContentSlider } from '@/features/homepage/components/ContentSlider';
import { OfferCard } from '@/features/homepage/components/OfferCard';
import { ListingCard } from '@/features/homepage/components/ListingCard';
import { useEventCampaignData } from '../hooks/useEventCampaignData';

interface EventsCampaignSectionProps {
  className?: string;
  maxItems?: number;
  maxOffers?: number;
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

export function EventsCampaignSection({
  className = '',
  maxItems = 5,
  maxOffers,
  maxListings
}: EventsCampaignSectionProps) {
  const { offers, featuredListings, isLoading, error } = useEventCampaignData();

  const offersLimit = maxOffers ?? maxItems;
  const listingsLimit = maxListings ?? maxItems;

  if (error) {
    return null; // Silent fail - campaigns are supplementary
  }

  const hasOffers = offers && offers.length > 0;
  const hasListings = featuredListings && featuredListings.length > 0;

  if (!isLoading && !hasOffers && !hasListings) {
    return null;
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {isLoading ? (
        <SectionSkeleton />
      ) : hasOffers ? (
        <ContentSlider title="Featured Offers" icon={Gift} moreLink="/offers" showArrows={true}>
          {offers.slice(0, offersLimit).map(offer => (
            <OfferCard key={offer.id} offer={offer} />
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

export default EventsCampaignSection;
