/**
 * AddressAutocomplete - Mapbox Geocoding Address Autocomplete
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD - Address search component
 * @phase Phase 4 - Contact Information
 *
 * FEATURES:
 * - Mapbox Geocoding API integration
 * - Debounced search (300ms)
 * - USA-only results
 * - Location-based proximity biasing (browser geolocation + IP fallback)
 * - Auto-parse city, state, zipCode from context
 * - Auto-populate lat/long on selection
 * - Loading and error states
 * - Accessible dropdown with keyboard navigation
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPES
// ============================================================================

interface AddressAutocompleteProps {
  /** Current address value */
  value: string;
  /** Change callback with parsed address data */
  onChange: (data: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number | null;
    longitude: number | null;
  }) => void;
  /** Optional placeholder */
  placeholder?: string;
  /** Optional className */
  className?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string; // The street name (e.g., "Hanaford Avenue")
  address?: string; // The street number (e.g., "1718") - only for address features
  center: [number, number]; // [longitude, latitude]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string; // State abbreviation like "US-ND"
  }>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter street address',
  className = '',
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // User's location for proximity biasing (longitude, latitude)
  const [proximity, setProximity] = useState<{ lng: number; lat: number } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync with external value changes (e.g., from Google import)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Get user's location for proximity biasing
  // Tries browser geolocation first, falls back to IP-based geolocation
  useEffect(() => {
    let isMounted = true;

    const getLocationFromIP = async () => {
      try {
        // Use ipapi.co for IP-based geolocation (free, no API key needed)
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.latitude && data.longitude) {
            setProximity({ lng: data.longitude, lat: data.latitude });
          }
        }
      } catch {
        // Silently fail - proximity is optional enhancement
      }
    };

    // Try browser geolocation first (more accurate)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            setProximity({
              lng: position.coords.longitude,
              lat: position.coords.latitude
            });
          }
        },
        () => {
          // Browser geolocation denied or failed, try IP fallback
          getLocationFromIP();
        },
        { timeout: 5000, maximumAge: 300000 } // 5s timeout, cache for 5 minutes
      );
    } else {
      // No browser geolocation, use IP fallback
      getLocationFromIP();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Parse city, state, zipCode from Mapbox context array
  const parseAddressComponents = useCallback((feature: MapboxFeature) => {
    let city = '';
    let state = '';
    let zipCode = '';
    let streetAddress = '';

    // Build street address from feature.address (street number) + feature.text (street name)
    // Mapbox address features have: address="1718", text="Hanaford Avenue"
    if (feature.address && feature.text) {
      streetAddress = `${feature.address} ${feature.text}`;
    } else if (feature.text) {
      streetAddress = feature.text;
    } else if (feature.place_name) {
      // Fallback: extract first part of full address before comma
      streetAddress = feature.place_name.split(',')[0]?.trim() || feature.place_name;
    }

    if (feature.context) {
      for (const item of feature.context) {
        if (item.id.startsWith('place.')) {
          city = item.text;
        } else if (item.id.startsWith('region.')) {
          // Extract state abbreviation from short_code (e.g., "US-ND" -> "ND")
          if (item.short_code) {
            // short_code format is "US-XX" where XX is the state abbreviation
            const parts = item.short_code.split('-');
            const stateCode = parts[1];
            state = stateCode ? stateCode.toUpperCase() : item.short_code.toUpperCase();
          } else {
            // Fallback: use first 2 characters of the text (not ideal but better than numbers)
            state = item.text.substring(0, 2).toUpperCase();
          }
        } else if (item.id.startsWith('postcode.')) {
          zipCode = item.text;
        }
      }
    }

    return { streetAddress, city, state, zipCode };
  }, []);

  // Fetch suggestions from Mapbox Geocoding API
  // Trigger after 3 characters regardless of type (numerals, letters, or spaces)
  // Uses proximity biasing to prioritize addresses near user's location
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      setError('Mapbox access token not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const encodedQuery = encodeURIComponent(query);
      // Build URL with optional proximity parameter for location biasing
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${accessToken}&country=us&types=address&limit=5`;

      // Add proximity biasing if user location is available
      // Format: proximity=longitude,latitude
      if (proximity) {
        url += `&proximity=${proximity.lng},${proximity.lat}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data: MapboxResponse = await response.json();
      setSuggestions(data.features || []);
      setShowDropdown(data.features.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      ErrorService.capture('Address autocomplete error:', err);
      setError('Failed to load address suggestions');
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, [proximity]);

  // Handle input change with debounce
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  }, [fetchSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((feature: MapboxFeature) => {
    const [longitude, latitude] = feature.center;
    const { streetAddress, city, state, zipCode } = parseAddressComponents(feature);

    // Display just the street address in the input (not the full formatted address)
    setInputValue(streetAddress);
    setSuggestions([]);
    setShowDropdown(false);

    onChange({
      address: streetAddress,
      city,
      state,
      zipCode,
      latitude,
      longitude,
    });
  }, [onChange, parseAddressComponents]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showDropdown, suggestions, selectedIndex, handleSelectSuggestion]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length >= 3 && suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          aria-label="Address autocomplete"
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          aria-expanded={showDropdown}
        />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-[#8d918d]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id="address-suggestions"
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-[#8d918d]/30 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((feature, index) => (
            <button
              key={feature.id}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelectSuggestion(feature)}
              className={`w-full px-4 py-3 text-left hover:bg-[#f8f9fa] transition-colors ${
                index === selectedIndex ? 'bg-[#f8f9fa]' : ''
              } ${index > 0 ? 'border-t border-[#8d918d]/10' : ''}`}
            >
              <div className="text-sm text-[#022641]">{feature.place_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
