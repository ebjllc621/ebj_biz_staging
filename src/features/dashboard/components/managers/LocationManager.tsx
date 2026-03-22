/**
 * LocationManager - Manage Business Location
 *
 * @description Edit address with Mapbox autocomplete, auto-fill city/state/zip/lat/lng,
 *              interactive map preview with tier-based custom marker.
 *              Synced with DB, listing details page, and new/edit listing modals.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages (Enhanced)
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, MapPin, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { AddressAutocomplete } from '@features/listings/components/NewListingModal/shared/AddressAutocomplete/AddressAutocomplete';
import { LocationMap } from '@features/listings/components/NewListingModal/shared/LocationMap/LocationMap';
import type { ListingTier } from '@features/listings/types/listing-form.types';

// ============================================================================
// TYPES
// ============================================================================

interface LocationFormData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

function LocationManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<LocationFormData>({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    latitude: null,
    longitude: null
  });

  // Initialize from full listing data
  useEffect(() => {
    if (listing) {
      setFormData({
        address: listing.address || '',
        city: listing.city || '',
        state: listing.state || '',
        zipCode: listing.zip_code || '',
        country: listing.country || 'US',
        // Parse to number — MariaDB DECIMAL/FLOAT columns return strings
        latitude: listing.latitude != null ? Number(listing.latitude) : null,
        longitude: listing.longitude != null ? Number(listing.longitude) : null
      });
    }
  }, [listing]);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setFormData({
        address: listing.address || '',
        city: listing.city || '',
        state: listing.state || '',
        zipCode: listing.zip_code || '',
        country: listing.country || 'US',
        latitude: listing.latitude != null ? Number(listing.latitude) : null,
        longitude: listing.longitude != null ? Number(listing.longitude) : null
      });
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  // Mapbox autocomplete selection handler — auto-fills all location fields
  const handleAddressChange = useCallback((data: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    setFormData(prev => ({
      ...prev,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      latitude: data.latitude,
      longitude: data.longitude
    }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateListing({
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zipCode || undefined,
        country: formData.country || 'US',
        latitude: formData.latitude,
        longitude: formData.longitude
      });
      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [formData, updateListing, refreshListing, refreshListings]);

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error loading data
  if (loadError) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{loadError}</span>
        <button
          onClick={() => refreshListing()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-8 text-gray-600">No listing selected</div>;
  }

  const listingTier = (listing.tier || 'essentials') as ListingTier;

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Location</h2>
          <p className="text-sm text-gray-500 mt-1">
            Business address displayed on your listing page and used for map display
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Update Error */}
      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* View Mode */}
      {!isEditing ? (
        <div className="space-y-4">
          {/* Address display */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-[#ed6437]" />
              </div>
              <div>
                {formData.address ? (
                  <>
                    <p className="text-gray-900 font-medium">{formData.address}</p>
                    <p className="text-gray-600 text-sm mt-0.5">
                      {[formData.city, formData.state, formData.zipCode].filter(Boolean).join(', ')}
                    </p>
                    {formData.country && formData.country !== 'US' && (
                      <p className="text-gray-600 text-sm">{formData.country}</p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 italic">No address set</p>
                )}
              </div>
            </div>
          </div>

          {/* Map preview (view mode) */}
          <div className="w-full">
            <LocationMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              tier={listingTier}
              width={800}
              height={300}
              markerSize={{ width: 64, height: 80 }}
            />
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-5">
          {/* Address Autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <AddressAutocomplete
              value={formData.address}
              onChange={handleAddressChange}
              placeholder="Start typing your address..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Start typing your street address and select from the suggestions to auto-fill city, state, ZIP, and map coordinates.
            </p>
          </div>

          {/* City / State / ZIP — auto-filled, manually editable */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                maxLength={2}
              />
            </div>
            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                maxLength={10}
              />
            </div>
          </div>

          {/* Lat / Lng — readonly, auto-populated by autocomplete */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
                <span className="ml-1 text-xs text-gray-400">(auto-filled)</span>
              </label>
              <input
                type="text"
                id="latitude"
                value={formData.latitude !== null ? formData.latitude.toFixed(6) : ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
                <span className="ml-1 text-xs text-gray-400">(auto-filled)</span>
              </label>
              <input
                type="text"
                id="longitude"
                value={formData.longitude !== null ? formData.longitude.toFixed(6) : ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Map preview (edit mode — updates as address is selected) */}
          <div className="w-full">
            <LocationMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              tier={listingTier}
              width={800}
              height={300}
              markerSize={{ width: 64, height: 80 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function LocationManager() {
  return (
    <ErrorBoundary componentName="LocationManager">
      <LocationManagerContent />
    </ErrorBoundary>
  );
}

export default LocationManager;
