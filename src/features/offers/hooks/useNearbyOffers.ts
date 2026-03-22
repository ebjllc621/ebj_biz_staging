/**
 * useNearbyOffers - Hook for fetching geo-targeted nearby offers
 *
 * @hook Client Hook
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Offer } from '@features/offers/types';

interface UseNearbyOffersOptions {
  autoLoad?: boolean;
  radiusKm?: number;
  limit?: number;
}

interface UseNearbyOffersReturn {
  offers: Offer[];
  loading: boolean;
  error: string | null;
  userLocation: { lat: number; lng: number } | null;
  locationError: string | null;
  fetchNearbyOffers: () => Promise<void>;
  requestLocation: () => Promise<void>;
}

export function useNearbyOffers({
  autoLoad = false,
  radiusKm = 10,
  limit = 20,
}: UseNearbyOffersOptions = {}): UseNearbyOffersReturn {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
          resolve();
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setLocationError('Location permission denied');
              break;
            case err.POSITION_UNAVAILABLE:
              setLocationError('Location information unavailable');
              break;
            case err.TIMEOUT:
              setLocationError('Location request timed out');
              break;
            default:
              setLocationError('An unknown error occurred');
          }
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  const fetchNearbyOffers = useCallback(async () => {
    if (!userLocation) {
      await requestLocation();
    }

    if (!userLocation) {
      setError('Location required to find nearby offers');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: userLocation.lat.toString(),
        lng: userLocation.lng.toString(),
        radius_km: radiusKm.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/offers/nearby?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch nearby offers');
      }

      const data = await response.json();
      setOffers(data.offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusKm, limit, requestLocation]);

  useEffect(() => {
    if (autoLoad) {
      fetchNearbyOffers();
    }
  }, [autoLoad, fetchNearbyOffers]);

  return {
    offers,
    loading,
    error,
    userLocation,
    locationError,
    fetchNearbyOffers,
    requestLocation,
  };
}
