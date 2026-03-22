/**
 * GeoFenceConfig - Map-based geo-fence setup
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { GeoFenceRadius } from './GeoFenceRadius';
import type { GeoTriggerConfig } from '@features/offers/types';

interface GeoFenceConfigProps {
  value: GeoTriggerConfig;
  onChange: (config: GeoTriggerConfig) => void;
  listingCoordinates?: { lat: number; lng: number } | null;
  disabled?: boolean;
}

export function GeoFenceConfig({
  value,
  onChange,
  listingCoordinates,
  disabled,
}: GeoFenceConfigProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleUseListingLocation = useCallback(() => {
    if (listingCoordinates) {
      onChange({
        ...value,
        latitude: listingCoordinates.lat,
        longitude: listingCoordinates.lng,
      });
    }
  }, [listingCoordinates, value, onChange]);

  const handleSearchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Use browser's Geolocation API or Mapbox geocoding
      // For now, this is a placeholder - would integrate with Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (error) {
      console.error('Failed to geocode address:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, value, onChange]);

  const handleRadiusChange = (radius: number) => {
    onChange({
      ...value,
      radius_meters: radius,
    });
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      notification_message: e.target.value,
    });
  };

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="w-4 h-4 text-purple-600" />
        Geo-Fence Configuration
      </div>

      {/* Quick Actions */}
      {listingCoordinates && (
        <button
          type="button"
          onClick={handleUseListingLocation}
          disabled={disabled}
          className="w-full px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 disabled:opacity-50"
        >
          Use Business Location
        </button>
      )}

      {/* Location Search */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">Search Location</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter address or place..."
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSearchLocation}
            disabled={disabled || searching || !searchQuery.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Latitude</label>
          <input
            type="number"
            value={value.latitude || ''}
            onChange={(e) => onChange({ ...value, latitude: parseFloat(e.target.value) || 0 })}
            step="0.000001"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Longitude</label>
          <input
            type="number"
            value={value.longitude || ''}
            onChange={(e) => onChange({ ...value, longitude: parseFloat(e.target.value) || 0 })}
            step="0.000001"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 text-sm"
          />
        </div>
      </div>

      {/* Radius Selector */}
      <GeoFenceRadius
        value={value.radius_meters || 500}
        onChange={handleRadiusChange}
        disabled={disabled}
      />

      {/* Notification Message */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">
          Notification Message (optional)
        </label>
        <input
          type="text"
          value={value.notification_message || ''}
          onChange={handleMessageChange}
          placeholder="e.g., You're near our store! Check out this deal..."
          maxLength={255}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          Custom message shown when users enter the geo-fence area
        </p>
      </div>
    </div>
  );
}
