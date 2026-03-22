/**
 * ListingOtherLocations - Additional Business Locations
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Other business locations display
 * - Address, phone, hours for each
 * - Distance from current location (if geolocation available)
 * - Link to individual location pages
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { MapPinned, Phone, ExternalLink, Navigation, Settings, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { Listing } from '@core/services/ListingService';

interface OtherLocation {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  is_primary: boolean;
  distance_miles?: number;
}

export interface ListingOtherLocationsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
  isEditMode?: boolean;
}

export function ListingOtherLocations({ listing, isEditing, isEditMode }: ListingOtherLocationsProps) {
  // Support both prop names for backward compatibility
  const inEditMode = isEditMode ?? isEditing;
  const [locations, setLocations] = useState<OtherLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch other locations
  useEffect(() => {
    let isMounted = true;

    async function fetchLocations() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/locations`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          // Filter out the current listing (primary location)
          const otherLocs = (result.data || []).filter((loc: OtherLocation) => !loc.is_primary);
          setLocations(otherLocs);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load locations');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchLocations();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no other locations
  if (inEditMode && !isLoading && locations.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Other Locations
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No additional locations yet. Add other business locations.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/locations` as any}
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

  // Return null in published mode when no other locations
  if (!isLoading && locations.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <MapPinned className="w-5 h-5 text-biz-orange" />
          Other Locations
          {!isLoading && locations.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({locations.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Locations List */}
      {!isLoading && !error && locations.length > 0 && (
        <div className="space-y-4">
          {locations.map((location) => (
            <div
              key={location.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Location Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    {location.distance_miles !== undefined && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {location.distance_miles.toFixed(1)} mi away
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="text-sm text-gray-600 mb-2">
                    <div>{location.address}</div>
                    <div>{location.city}, {location.state} {location.zip}</div>
                  </div>

                  {/* Phone */}
                  {location.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Phone className="w-4 h-4" />
                      <a
                        href={`tel:${location.phone}`}
                        className="text-biz-orange hover:underline"
                      >
                        {location.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* View Location Link */}
                <Link
                  href={`/listings/${location.slug}`}
                  className="flex-shrink-0 px-4 py-2 bg-biz-orange text-white rounded-lg hover:bg-biz-orange/90 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  View Location
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
