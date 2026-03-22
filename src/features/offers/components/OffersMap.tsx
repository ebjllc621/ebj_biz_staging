/**
 * OffersMap - Interactive Mapbox Map for Offers Page
 *
 * Displays offer locations as markers on a Mapbox GL JS map.
 * Supports marker click for preview popup and interaction with offer grid.
 *
 * @component Client Component (requires 'use client' directive)
 * @tier ADVANCED (third-party library, async initialization)
 * @phase Phase 5 - Map Integration
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * @see docs/pages/layouts/offers/phases/PHASE_5_BRAIN_PLAN.md
 * @see src/features/events/components/EventsMap.tsx - Canonical pattern
 */
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import { MapPin, Tag, Clock } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { OfferWithCoordinates } from '@/features/offers/types';
import Image from 'next/image';
import { getMarkerImage, MAP_MARKER_SIZE } from '@/features/listings/constants/mapMarkers';
import { ErrorService } from '@core/services/ErrorService';

interface OffersMapProps {
  /** Offers with coordinate data */
  offers: OfferWithCoordinates[];
  /** Callback when marker is clicked */
  onMarkerClick?: (_offerId: number) => void;
  /** Callback when marker is hovered */
  onMarkerHover?: (_offerId: number | null) => void;
  /** Currently highlighted offer ID (from grid hover) */
  highlightedOfferId?: number | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate days remaining until offer expires
 */
function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Format price for display with USD symbol
 */
function formatPrice(price: number | undefined): string {
  if (price === undefined) return '';
  return `$${Number(price).toFixed(2)}`;
}

/**
 * OffersMap Component
 */
export function OffersMap({
  offers,
  onMarkerClick,
  onMarkerHover: _onMarkerHover,
  highlightedOfferId,
  className = '',
}: OffersMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<OfferWithCoordinates | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Mapbox token validation
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // Filter offers with valid coordinates
  const offersWithCoords = useMemo(
    () =>
      offers.filter(
        (offer): offer is OfferWithCoordinates & { latitude: number; longitude: number } =>
          offer.latitude !== null &&
          offer.longitude !== null &&
          typeof offer.latitude === 'number' &&
          typeof offer.longitude === 'number'
      ),
    [offers]
  );

  // Calculate map center from offers
  const mapCenter = useMemo(() => {
    if (offersWithCoords.length === 0) {
      return { latitude: 43.6532, longitude: -79.3832, zoom: 11 }; // Default (Toronto)
    }

    const avgLat =
      offersWithCoords.reduce((sum, o) => sum + o.latitude, 0) / offersWithCoords.length;
    const avgLng =
      offersWithCoords.reduce((sum, o) => sum + o.longitude, 0) / offersWithCoords.length;

    return { latitude: avgLat, longitude: avgLng, zoom: 11 };
  }, [offersWithCoords]);

  const [viewState, setViewState] = useState(mapCenter);

  // Update viewState when mapCenter changes
  useEffect(() => {
    setViewState(mapCenter);
  }, [mapCenter]);

  // Handle map load
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    setMapError(null);
  }, []);

  // Handle map error
  const handleMapError = useCallback((evt: { error: { message: string } }) => {
    ErrorService.capture('Mapbox load error:', evt.error);
    setMapError('Failed to load map. Please check your connection and try again.');
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback(
    (offer: OfferWithCoordinates & { latitude: number; longitude: number }) => {
      setPopupInfo(offer);
      if (onMarkerClick) {
        onMarkerClick(offer.id);
      }
    },
    [onMarkerClick]
  );

  // Missing API token
  if (!mapboxToken) {
    return (
      <div className={`h-[600px] bg-yellow-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <p className="text-yellow-800 font-medium">Map configuration required</p>
          <p className="text-yellow-600 text-sm">Mapbox API token not configured</p>
        </div>
      </div>
    );
  }

  // Map error state
  if (mapError) {
    return (
      <div className={`h-[600px] bg-red-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-800 font-medium mb-2">Map Error</p>
          <p className="text-red-600 text-sm mb-4">{mapError}</p>
          <button
            onClick={() => {
              setMapError(null);
              setMapLoaded(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No offers with coordinates
  if (offersWithCoords.length === 0) {
    return (
      <div className={`h-[600px] bg-gray-50 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <Tag className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600">No offers with location data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} role="application" aria-label="Interactive map showing offer locations">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onLoad={handleMapLoad}
        onError={handleMapError}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />

        {/* Markers */}
        {offersWithCoords.map((offer) => (
          <Marker
            key={offer.id}
            latitude={offer.latitude}
            longitude={offer.longitude}
            anchor="bottom"
            onClick={(e: { originalEvent: { stopPropagation: () => void } }) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(offer);
            }}
          >
            <div
              onMouseEnter={() => _onMarkerHover?.(offer.id)}
              onMouseLeave={() => _onMarkerHover?.(null)}
              aria-label={`${offer.title} marker`}
              className={`transition-transform cursor-pointer ${
                highlightedOfferId === offer.id ? 'scale-125' : ''
              }`}
            >
              {/* Use listing tier-based markers */}
              <img
                src={getMarkerImage(offer.listing_claimed, offer.listing_tier)}
                alt={`${offer.listing_tier} tier marker`}
                width={MAP_MARKER_SIZE.width}
                height={MAP_MARKER_SIZE.height}
                className="drop-shadow-md"
              />
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {popupInfo && (
          <Popup
            latitude={popupInfo.latitude!}
            longitude={popupInfo.longitude!}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            className="mapbox-popup"
          >
            <div className="p-3 max-w-xs">
              {/* Offer Image with Discount Badge */}
              {(popupInfo.image || popupInfo.thumbnail) && (
                <div className="relative w-full h-32 mb-2 rounded-md overflow-hidden">
                  <Image
                    src={popupInfo.thumbnail || popupInfo.image!}
                    alt={popupInfo.title}
                    fill
                    className="object-cover"
                  />
                  {/* Discount Badge Overlay */}
                  {popupInfo.discount_percentage && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold">
                      -{popupInfo.discount_percentage}%
                    </div>
                  )}
                </div>
              )}

              {/* Offer Info */}
              <div className="space-y-1">
                {/* Listing Name (Orange, Uppercase) */}
                {popupInfo.listing_name && (
                  <p className="text-xs font-medium text-biz-orange uppercase">
                    {popupInfo.listing_name}
                  </p>
                )}

                {/* Offer Title */}
                <h3 className="font-semibold text-gray-900">{popupInfo.title}</h3>

                {/* Price */}
                {(popupInfo.original_price || popupInfo.sale_price) && (
                  <div className="flex items-center gap-2 text-sm">
                    {popupInfo.original_price && (
                      <span className="line-through text-gray-500">
                        {formatPrice(popupInfo.original_price)}
                      </span>
                    )}
                    {popupInfo.sale_price && (
                      <span className="font-bold text-biz-navy">
                        {formatPrice(popupInfo.sale_price)} USD
                      </span>
                    )}
                  </div>
                )}

                {/* Days Remaining */}
                {popupInfo.end_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>{getDaysRemaining(popupInfo.end_date)} days remaining</span>
                  </div>
                )}

                {/* Offer Type Badge */}
                {popupInfo.offer_type && (
                  <div className="inline-block">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-biz-orange/10 text-biz-orange">
                      {popupInfo.offer_type}
                    </span>
                  </div>
                )}
              </div>

              {/* View Offer Link */}
              <a
                href={`/offers/${popupInfo.slug}`}
                className="mt-2 inline-block text-xs text-biz-navy hover:text-biz-orange transition-colors"
              >
                View Offer →
              </a>
            </div>
          </Popup>
        )}
      </Map>

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-500">Loading map...</span>
        </div>
      )}
    </div>
  );
}

export default OffersMap;
