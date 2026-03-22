/**
 * SidebarLocationCard - Compact Location Map
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase R3 - Sidebar Feature Correction
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Compact 300x120 map thumbnail
 * - Tier-based marker colors
 * - Address display
 * - Get Directions button
 * - Returns null if no location data
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_R3_BRAIN_PLAN.md
 */
'use client';

import { useCallback, useMemo } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { buildStaticMapMarker } from '@features/listings/constants/mapMarkers';

interface SidebarLocationCardProps {
  /** Listing data */
  listing: Listing;
}

export function SidebarLocationCard({ listing }: SidebarLocationCardProps) {
  // Return null if no location data
  if (!listing.latitude && !listing.address) {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Build compact map URL (300x120) with tier-based marker
  // Uses custom icon in production, falls back to color markers in development
  const mapUrl = useMemo(() => {
    if (!listing.latitude || !listing.longitude || !apiKey) return null;

    const markerParam = buildStaticMapMarker(
      listing.latitude,
      listing.longitude,
      listing.claimed,
      listing.tier || 'essentials'
    );

    return `https://maps.googleapis.com/maps/api/staticmap?center=${listing.latitude},${listing.longitude}&zoom=14&size=300x120&markers=${markerParam}&scale=2&key=${apiKey}`;
  }, [listing.latitude, listing.longitude, listing.claimed, listing.tier, apiKey]);

  // Handle directions button click
  const handleDirections = useCallback(() => {
    if (listing.latitude && listing.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`,
        '_blank',
        'noopener,noreferrer'
      );
    } else if (listing.address) {
      const fullAddress = [listing.address, listing.city, listing.state, listing.zip_code]
        .filter(Boolean)
        .join(', ');
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  }, [listing]);

  // Build address string
  const addressString = useMemo(() => {
    const parts = [listing.address, listing.city, listing.state, listing.zip_code].filter(Boolean);
    return parts.join(', ');
  }, [listing]);

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Section Title */}
      <div className="px-3 pt-3 pb-2">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-biz-orange" />
          Location
        </h4>
      </div>

      {/* Map Thumbnail */}
      {mapUrl && (
        <button
          onClick={handleDirections}
          className="relative w-full h-[120px] bg-gray-100 overflow-hidden group cursor-pointer"
          aria-label="Get directions"
        >
          <img
            src={mapUrl}
            alt={`Map showing ${listing.name}`}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <Navigation className="w-5 h-5 text-white" />
          </div>
        </button>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Address */}
        {addressString && (
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-600 leading-relaxed">
              {addressString}
            </span>
          </div>
        )}

        {/* Get Directions Button */}
        <button
          onClick={handleDirections}
          className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Get Directions
        </button>
      </div>
    </div>
  );
}

export default SidebarLocationCard;
