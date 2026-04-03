/**
 * ListingLocation - Map and Address Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3 - Location & Contact
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Google Maps Static API display with tier-based marker
 * - Full address with copy-to-clipboard
 * - "Get Directions" button opens Google Maps
 * - Responsive: Full-width on mobile, sidebar card on desktop
 * - Loading state with skeleton
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_3_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, Copy, Check, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { buildStaticMapMarker } from '@features/listings/constants/mapMarkers';

interface ListingLocationProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

export function ListingLocation({ listing, isEditMode }: ListingLocationProps) {
  const [copied, setCopied] = useState(false);

  // Build full address string
  const fullAddress = [
    listing.address,
    listing.city,
    listing.state,
    listing.zip_code,
    listing.country
  ].filter(Boolean).join(', ');

  const hasLocation = Boolean(listing.address || listing.latitude);

  // Handle copy address
  const handleCopy = useCallback(async () => {
    if (!fullAddress) return;
    await navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fullAddress]);

  // Handle get directions
  const handleDirections = useCallback(() => {
    if (listing.latitude && listing.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`,
        '_blank'
      );
    } else if (fullAddress) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`,
        '_blank'
      );
    }
  }, [listing.latitude, listing.longitude, fullAddress]);

  // Show empty state in edit mode when no location
  if (isEditMode && !hasLocation) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Location
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No location yet. Add your business address to display on maps.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/location` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no location
  if (!hasLocation) {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Build static map URL with tier-based marker
  // Uses custom icon in production, falls back to color markers in development
  const mapUrl = useMemo(() => {
    if (!listing.latitude || !listing.longitude || !apiKey) return null;

    const markerParam = buildStaticMapMarker(
      listing.latitude,
      listing.longitude,
      listing.claimed,
      listing.tier || 'essentials'
    );

    return `https://maps.googleapis.com/maps/api/staticmap?center=${listing.latitude},${listing.longitude}&zoom=15&size=600x300&markers=${markerParam}&scale=2&key=${apiKey}`;
  }, [listing.latitude, listing.longitude, listing.claimed, listing.tier, apiKey]);

  return (
    <section className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Map Display */}
      {mapUrl && (
        <div className="relative w-full h-48 md:h-64 bg-gray-100">
          <img
            src={mapUrl}
            alt={`Map showing location of ${listing.name}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer-when-downgrade"
          />
          {/* Overlay for click-to-directions on mobile */}
          <button
            onClick={handleDirections}
            className="absolute inset-0 bg-transparent md:hidden"
            aria-label="Get directions"
          />
        </div>
      )}

      {/* Address and Actions */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-biz-orange" />
          Location
        </h2>

        {/* Full Address */}
        {fullAddress && (
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">
              {listing.address && <span className="block">{listing.address}</span>}
              <span className="block">
                {[listing.city, listing.state, listing.zip_code].filter(Boolean).join(', ')}
              </span>
              {listing.country && listing.country !== 'US' && (
                <span className="block">{listing.country}</span>
              )}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Get Directions */}
          <button
            onClick={handleDirections}
            className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Get Directions
          </button>

          {/* Copy Address */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Copy address"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Address
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

export default ListingLocation;
