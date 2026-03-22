/**
 * NewListingModal - Section 2: Basic Information
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE
 * @phase Phase 3 - Full Implementation
 *
 * FEATURES:
 * - Google Business import
 * - Business name with auto-slug generation
 * - Type selection dropdown
 * - Year established input
 * - Slogan input
 * - Keywords tag input
 * - Category selector with drag-and-drop
 * - Rich text editor switcher for description
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ListingFormData, TierLimits, Category, BusinessHours } from '../../../types/listing-form.types';
import { GoogleBusinessImport, GoogleBusinessData } from '../components/GoogleBusinessImport';
import { CategorySelector } from '../shared/CategorySelector';
import { DescriptionEditor } from '@/components/editors/DescriptionEditor';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Detect US timezone from longitude coordinate
 * Uses approximate longitude boundaries for US time zones
 * @param longitude - Longitude coordinate
 * @returns IANA timezone string
 */
function detectTimezoneFromLongitude(longitude: number | null): string {
  if (longitude === null) return 'America/New_York'; // Default fallback

  // US timezone boundaries (approximate longitudes)
  // These are simplified boundaries - actual timezone borders are more complex
  if (longitude <= -115) {
    return 'America/Los_Angeles'; // Pacific Time
  } else if (longitude <= -102) {
    return 'America/Denver'; // Mountain Time
  } else if (longitude <= -87) {
    return 'America/Chicago'; // Central Time
  } else {
    return 'America/New_York'; // Eastern Time
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface Section2BasicInfoProps {
  formData: ListingFormData;
  onUpdateField: <K extends keyof ListingFormData>(_field: K, _value: ListingFormData[K]) => void;
  onUpdateSection: (_data: Partial<ListingFormData>) => void;
  tier: ListingFormData['tier'];
  tierLimits: TierLimits;
}

interface BusinessType {
  id: number;
  name: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Section2BasicInfo({
  formData,
  onUpdateField,
  onUpdateSection,
  tier,
  tierLimits
}: Section2BasicInfoProps) {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [keywords, setKeywords] = useState(formData.keywords);
  const [keywordInput, setKeywordInput] = useState('');

  // Sync local keywords state when formData.keywords changes (edit mode)
  // This handles the case where formData loads asynchronously after component mount
  useEffect(() => {
    // Only sync if formData has keywords and local state is empty (initial load in edit mode)
    if (formData.keywords && formData.keywords.length > 0 && keywords.length === 0) {
      setKeywords(formData.keywords);
    }
  }, [formData.keywords, keywords.length]);

  // Fetch business types from API
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await fetch('/api/types', {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.types) {
            setBusinessTypes(result.data.types);
          }
        }
      } catch (err) {
        ErrorService.capture('Error fetching business types:', err);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    fetchTypes();
  }, []);

  // Handle Google Business import
  const handleImportSuccess = useCallback((data: GoogleBusinessData) => {
    const slug = generateSlug(data.name);

    // Build update object with all available imported data
    const updateData: Partial<ListingFormData> = {
      name: data.name,
      slug,
      phone: data.phone,
      website: data.website,
      description: data.description,
      address: data.address,
    };

    // Add location fields if available
    if (data.city) updateData.city = data.city;
    if (data.state) updateData.state = data.state;
    if (data.zip_code) updateData.zipCode = data.zip_code;
    if (data.country) updateData.country = data.country;
    if (data.latitude !== null) updateData.latitude = data.latitude;
    if (data.longitude !== null) updateData.longitude = data.longitude;

    // Detect and set timezone based on longitude coordinates
    if (data.longitude !== null) {
      updateData.timezone = detectTimezoneFromLongitude(data.longitude);
    }

    // Add business hours if available - transform from API format to form format
    if (data.business_hours && data.business_hours.length > 0) {
      updateData.businessHours = data.business_hours.map(hour => ({
        day: hour.day.toLowerCase() as BusinessHours['day'],
        isOpen: !hour.is_closed,
        openTime: hour.open || '',
        closeTime: hour.close || ''
      }));
    }

    // Add social media profiles if available
    if (data.social_media) {
      updateData.socialMedia = {
        facebook: data.social_media.facebook || '',
        instagram: data.social_media.instagram || '',
        twitter: data.social_media.twitter || '',
        linkedin: data.social_media.linkedin || '',
        youtube: data.social_media.youtube || '',
        tiktok: data.social_media.tiktok || ''
      };
    }

    // Add owner contact details if available
    if (data.owner_details) {
      if (data.owner_details.name) updateData.ownerName = data.owner_details.name;
      if (data.owner_details.email) updateData.ownerEmail = data.owner_details.email;
      if (data.owner_details.phone) updateData.ownerPhone = data.owner_details.phone;
    }

    // Note: Imported photos are available in data.photos[]
    // They can be used to populate the media section

    onUpdateSection(updateData);
  }, [onUpdateSection]);

  // Handle name change with auto-slug
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = generateSlug(name);

    onUpdateField('name', name);
    onUpdateField('slug', slug);
  }, [onUpdateField]);

  // Handle keyword input
  const handleKeywordAdd = useCallback((value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue && !keywords.includes(trimmedValue)) {
      const newKeywords = [...keywords, trimmedValue];
      setKeywords(newKeywords);
      onUpdateField('keywords', newKeywords);
    }
    setKeywordInput('');
  }, [keywords, onUpdateField]);

  const handleKeywordInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Add on comma
    if (value.includes(',')) {
      const keyword = value.replace(',', '').trim();
      if (keyword) {
        handleKeywordAdd(keyword);
      }
    } else {
      setKeywordInput(value);
    }
  }, [handleKeywordAdd]);

  const handleKeywordInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      handleKeywordAdd(keywordInput);
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      // Remove last keyword on backspace if input is empty
      const newKeywords = keywords.slice(0, -1);
      setKeywords(newKeywords);
      onUpdateField('keywords', newKeywords);
    }
  }, [keywordInput, keywords, handleKeywordAdd, onUpdateField]);

  const handleRemoveKeyword = useCallback((index: number) => {
    const newKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(newKeywords);
    onUpdateField('keywords', newKeywords);
  }, [keywords, onUpdateField]);

  // Handle categories update - auto-add keywords from newly added categories
  const handleCategoriesUpdate = useCallback((active: Category[], bank: Category[]) => {
    // Detect newly added categories (not in previous active list)
    const previousActiveIds = new Set(formData.activeCategories.map(c => c.id));
    const newCategories = active.filter(c => !previousActiveIds.has(c.id));

    // Collect keywords from new categories
    const newKeywordsToAdd: string[] = [];
    for (const category of newCategories) {
      if (category.keywords && Array.isArray(category.keywords)) {
        for (const keyword of category.keywords) {
          // Only add if not already in keywords list and not already queued
          if (keyword && !keywords.includes(keyword) && !newKeywordsToAdd.includes(keyword)) {
            newKeywordsToAdd.push(keyword);
          }
        }
      }
    }

    // Auto-add category keywords to the keywords list
    if (newKeywordsToAdd.length > 0) {
      const updatedKeywords = [...keywords, ...newKeywordsToAdd];
      setKeywords(updatedKeywords);
      onUpdateField('keywords', updatedKeywords);
    }

    onUpdateField('activeCategories', active);
    onUpdateField('bankCategories', bank);
  }, [onUpdateField, formData.activeCategories, keywords]);


  return (
    <div className="space-y-6">
      {/* Google Business Import - Self-contained panel design */}
      <GoogleBusinessImport onImportSuccess={handleImportSuccess} />

      {/* Listing Name & Type (Grid on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="listing-name" className="block text-sm font-medium text-[#022641] mb-2">
            Listing Name <span className="text-red-500">*</span>
          </label>
          <input
            id="listing-name"
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Enter listing name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            required
          />
          {formData.slug && (
            <div className="mt-1 text-xs text-gray-500">
              URL Slug: <span className="font-mono">{formData.slug}</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="listing-type" className="block text-sm font-medium text-[#022641] mb-2">
            Listing Type <span className="text-red-500">*</span>
          </label>
          <select
            id="listing-type"
            value={formData.type}
            onChange={(e) => onUpdateField('type', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            disabled={isLoadingTypes}
            required
          >
            <option value="">Select a type...</option>
            {businessTypes
              .filter((type) => type.name.toLowerCase() !== 'unclaimed')
              .map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
          </select>
          {isLoadingTypes && (
            <div className="mt-1 text-xs text-gray-500">Loading types...</div>
          )}
        </div>
      </div>

      {/* Year Established & Slogan (Grid on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="year-established" className="block text-sm font-medium text-[#022641] mb-2">
            Year Established
          </label>
          <input
            id="year-established"
            type="number"
            value={formData.yearEstablished || ''}
            onChange={(e) => onUpdateField('yearEstablished', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="e.g., 2020"
            min="1800"
            max={new Date().getFullYear()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
          />
        </div>

        <div>
          <label htmlFor="slogan" className="block text-sm font-medium text-[#022641] mb-2">
            Slogan
          </label>
          <input
            id="slogan"
            type="text"
            value={formData.slogan}
            onChange={(e) => onUpdateField('slogan', e.target.value)}
            placeholder="Enter business slogan"
            maxLength={100}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="mb-2">
          <label className="block text-sm font-medium text-[#022641]">
            Categories <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Categories help customers find your listing through search and browsing. Choose categories that best describe your listing to improve visibility and SEO ranking.
          </p>
        </div>
        <CategorySelector
          activeCategories={formData.activeCategories}
          bankCategories={formData.bankCategories}
          onUpdateCategories={handleCategoriesUpdate}
          tierLimits={tierLimits}
        />
      </div>

      {/* Keywords */}
      <div>
        <label htmlFor="keywords-input" className="block text-sm font-medium text-[#022641] mb-2">
          Keywords
        </label>
        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[46px] focus-within:ring-2 focus-within:ring-[#ed6437] focus-within:border-[#ed6437]">
          {keywords.map((keyword, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-[#ed6437] text-white px-3 py-1 rounded-full text-sm"
            >
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(index)}
                className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                aria-label={`Remove ${keyword}`}
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
          <input
            id="keywords-input"
            type="text"
            value={keywordInput}
            onChange={handleKeywordInputChange}
            onKeyDown={handleKeywordInputKeyDown}
            placeholder={keywords.length === 0 ? "Add keywords (press Enter or comma)" : ""}
            className="flex-1 min-w-[150px] outline-none px-2 py-1"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {keywords.length} keywords added. Press Enter or comma to add. Category keywords are added automatically.
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[#022641] mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <DescriptionEditor
          value={formData.description}
          onChange={(value) => onUpdateField('description', value)}
          maxLength={tierLimits.descriptionLength}
          tier={tier}
          placeholder="Describe your business..."
        />
      </div>
    </div>
  );
}
