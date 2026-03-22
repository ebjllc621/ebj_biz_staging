/**
 * Section4Contact - Contact Information Form
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD - Complex form section
 * @phase Phase 4 - Contact Information
 *
 * FEATURES:
 * - Contact fields (phone, email, website, country)
 * - AddressAutocomplete integration with Mapbox
 * - City, state, zipCode fields (auto-populated from address)
 * - Lat/long display (readonly, auto-populated)
 * - LocationMap integration (visible when lat/long set)
 * - Social media links (6 platforms)
 * - Input validation on blur
 */

'use client';

import { useCallback } from 'react';
import type { ListingFormData, ListingTier, SocialMediaLinks } from '../../../types/listing-form.types';
import { SOCIAL_MEDIA_PLATFORMS } from '../constants';
import { AddressAutocomplete } from '../shared/AddressAutocomplete';
import { LocationMap } from '../shared/LocationMap';

// ============================================================================
// TYPES
// ============================================================================

interface Section4ContactProps {
  /** Complete form data */
  formData: ListingFormData;
  /** Update single field callback */
  onUpdateField: <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => void;
  /** Update multiple fields callback */
  onUpdateSection: (data: Partial<ListingFormData>) => void;
  /** Listing tier for map marker */
  tier: ListingTier;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Section4Contact({
  formData,
  onUpdateField,
  onUpdateSection,
  tier,
}: Section4ContactProps) {
  // Handle address autocomplete selection
  const handleAddressChange = useCallback((data: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    onUpdateSection(data);
  }, [onUpdateSection]);

  // Handle social media field change
  const handleSocialMediaChange = useCallback((
    platform: keyof SocialMediaLinks,
    value: string
  ) => {
    onUpdateField('socialMedia', {
      ...formData.socialMedia,
      [platform]: value,
    });
  }, [formData.socialMedia, onUpdateField]);

  // Basic input validation
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^\+?[\d\s\-().]+$/;
    return phoneRegex.test(phone);
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Fields Section */}
      <div>
        <h3 className="text-base font-semibold text-[#022641] mb-4">
          Contact Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-[#022641] mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => onUpdateField('phone', e.target.value)}
              onBlur={(e) => {
                if (!validatePhone(e.target.value)) {
                  alert('Please enter a valid phone number');
                }
              }}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#022641] mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => onUpdateField('email', e.target.value)}
              onBlur={(e) => {
                if (!validateEmail(e.target.value)) {
                  alert('Please enter a valid email address');
                }
              }}
              placeholder="contact@business.com"
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-[#022641] mb-2">
              Website
            </label>
            <input
              type="url"
              id="website"
              value={formData.website}
              onChange={(e) => onUpdateField('website', e.target.value)}
              onBlur={(e) => {
                if (!validateUrl(e.target.value)) {
                  alert('Please enter a valid URL (e.g., https://example.com)');
                }
              }}
              placeholder="https://www.business.com"
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-[#022641] mb-2">
              Country
            </label>
            <select
              id="country"
              value={formData.country}
              onChange={(e) => onUpdateField('country', e.target.value)}
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="US">United States</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div>
        <h3 className="text-base font-semibold text-[#022641] mb-4">
          Physical Address <span className="text-red-500">*</span>
        </h3>

        {/* Address Autocomplete */}
        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-[#022641] mb-2">
            Street Address
          </label>
          <AddressAutocomplete
            value={formData.address}
            onChange={handleAddressChange}
            placeholder="Start typing your address..."
          />
          <p className="mt-1.5 text-xs text-[#8d918d]">
            Start typing to search for your address using Mapbox geocoding
          </p>
        </div>

        {/* City, State, ZipCode - 3 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-[#022641] mb-2">
              City
            </label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => onUpdateField('city', e.target.value)}
              placeholder="City"
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-[#022641] mb-2">
              State
            </label>
            <input
              type="text"
              id="state"
              value={formData.state}
              onChange={(e) => onUpdateField('state', e.target.value)}
              placeholder="State"
              maxLength={2}
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent uppercase"
            />
          </div>

          {/* Zip Code */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-[#022641] mb-2">
              Zip Code
            </label>
            <input
              type="text"
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => onUpdateField('zipCode', e.target.value)}
              placeholder="Zip Code"
              className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
        </div>

        {/* Latitude / Longitude (Read-Only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-[#8d918d] mb-2">
              Latitude (Auto-generated)
            </label>
            <input
              type="text"
              id="latitude"
              value={typeof formData.latitude === 'number' ? formData.latitude.toFixed(6) : ''}
              readOnly
              placeholder="Auto-populated from address"
              className="w-full px-4 py-2.5 border border-[#8d918d]/20 rounded-lg bg-gray-50 text-[#8d918d] cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-[#8d918d] mb-2">
              Longitude (Auto-generated)
            </label>
            <input
              type="text"
              id="longitude"
              value={typeof formData.longitude === 'number' ? formData.longitude.toFixed(6) : ''}
              readOnly
              placeholder="Auto-populated from address"
              className="w-full px-4 py-2.5 border border-[#8d918d]/20 rounded-lg bg-gray-50 text-[#8d918d] cursor-not-allowed"
            />
          </div>
        </div>

        {/* Location Map (Visible when lat/long set) */}
        {formData.latitude && formData.longitude && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#022641] mb-2">
              Location Preview
            </label>
            <LocationMap
              latitude={formData.latitude}
              longitude={formData.longitude}
              tier={tier}
              width={600}
              height={300}
            />
          </div>
        )}
      </div>

      {/* Social Media Section */}
      <div>
        <h3 className="text-base font-semibold text-[#022641] mb-4">
          Social Media Links
        </h3>
        <p className="text-sm text-[#8d918d] mb-4">
          Connect your social media profiles to increase visibility
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
            <div key={platform.key}>
              <label htmlFor={platform.key} className="block text-sm font-medium text-[#022641] mb-2">
                {platform.label}
              </label>
              <input
                type="url"
                id={platform.key}
                value={formData.socialMedia[platform.key as keyof SocialMediaLinks]}
                onChange={(e) =>
                  handleSocialMediaChange(platform.key as keyof SocialMediaLinks, e.target.value)
                }
                onBlur={(e) => {
                  if (e.target.value && !validateUrl(e.target.value)) {
                    alert(`Please enter a valid ${platform.label} URL`);
                  }
                }}
                placeholder={platform.placeholder}
                className="w-full px-4 py-2.5 border border-[#8d918d]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
