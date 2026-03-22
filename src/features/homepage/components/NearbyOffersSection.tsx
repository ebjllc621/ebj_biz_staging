/**
 * NearbyOffersSection - Geo-targeted offers section for homepage
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Homepage Integration
 */

'use client';

import { useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useNearbyOffers } from '@features/offers/hooks/useNearbyOffers';
import { ContentSlider } from './ContentSlider';
import { OfferCard } from './OfferCard';
import type { OfferCardData } from '@features/homepage/types';
import type { Offer } from '@features/offers/types';

// The nearby API returns Offer rows with optional joined listing fields at runtime.
// This local interface captures those optional fields for safe mapping.
interface NearbyOfferItem extends Omit<Offer, 'thumbnail'> {
  listing_name?: string;
  listing_slug?: string;
  thumbnail?: string | null;
}

interface NearbyOffersSectionProps {
  maxOffers?: number;
}

function mapToOfferCardData(offer: NearbyOfferItem): OfferCardData {
  return {
    id: offer.id,
    title: offer.title,
    slug: offer.slug,
    listing_name: offer.listing_name ?? '',
    listing_slug: offer.listing_slug ?? offer.slug,
    offer_type: 'discount',
    original_price: offer.original_price ?? undefined,
    sale_price: offer.sale_price ?? undefined,
    discount_percentage: offer.discount_percentage ?? undefined,
    image: offer.image ?? offer.thumbnail ?? undefined,
    end_date: new Date(offer.end_date),
  };
}

export function NearbyOffersSection({ maxOffers = 6 }: NearbyOffersSectionProps) {
  const [hasFetched, setHasFetched] = useState(false);

  const { offers, loading, locationError, fetchNearbyOffers, requestLocation } =
    useNearbyOffers({ autoLoad: false });

  const handleOptIn = async () => {
    setHasFetched(true);
    await requestLocation();
    await fetchNearbyOffers();
  };

  // Location permission was denied — hide section entirely
  if (locationError) {
    return null;
  }

  // Fetched and no results found — hide section
  if (hasFetched && !loading && offers.length === 0) {
    return null;
  }

  // Loading after opt-in
  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-biz-orange animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  // Success — render slider
  if (offers.length > 0) {
    const displayOffers = (offers as NearbyOfferItem[]).slice(0, maxOffers);
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <ContentSlider title="Offers Near You" icon={MapPin} moreLink="/offers">
            {displayOffers.map((offer, index) => (
              <OfferCard key={offer.id} offer={mapToOfferCardData(offer)} index={index} />
            ))}
          </ContentSlider>
        </div>
      </section>
    );
  }

  // Initial state — show opt-in CTA
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
          <div className="w-16 h-16 bg-biz-orange/10 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-biz-orange" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-biz-navy mb-1">Find Offers Near You</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Allow location access to discover deals from businesses close to you.
            </p>
          </div>
          <button
            onClick={handleOptIn}
            className="inline-flex items-center gap-2 bg-biz-orange hover:bg-biz-orange/90 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Find Offers Near You
          </button>
        </div>
      </div>
    </section>
  );
}

export default NearbyOffersSection;
