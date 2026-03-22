/**
 * ContactInfoManager - Manage Business Contact Information
 *
 * @description Edit public contact info: phone, email, website (synced with listing details page)
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 11 - Contact Info & SEO Management
 * @authority docs/pages/layouts/listings/details/userdash/MASTER_INDEX_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for edit/save buttons
 * - Inline editing pattern (view/edit toggle, no modal)
 * - Uses useListingData hook to fetch FULL listing data
 * - Uses useListingUpdate hook for mutations
 * - Refreshes data after save
 * - Fields synced with listing details page: phone, email, website
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, Loader2, Phone, Mail, Globe } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

// ============================================================================
// TYPES
// ============================================================================

interface ContactInfoFormData {
  phone: string;
  email: string;
  website: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email) return true; // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format phone number for display
 */
function formatPhoneForDisplay(phone: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Normalize website URL for display (strip protocol/www)
 */
function formatWebsiteForDisplay(website: string | null): string {
  if (!website) return '';
  return website.replace(/^https?:\/\/(www\.)?/, '');
}

/**
 * Ensure website URL has protocol for href
 */
function normalizeWebsiteUrl(website: string): string {
  if (!website) return '';
  return website.startsWith('http') ? website : `https://${website}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

function ContactInfoManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ContactInfoFormData>({
    phone: '',
    email: '',
    website: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data from full listing data — synced with listing details page
  useEffect(() => {
    if (listing) {
      setFormData({
        phone: listing.phone || '',
        email: listing.email || '',
        website: listing.website || ''
      });
    }
  }, [listing]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (formData.email && !isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.website) {
      try {
        new URL(normalizeWebsiteUrl(formData.website));
      } catch {
        errors.website = 'Please enter a valid website URL';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleEdit = useCallback(() => {
    clearError();
    setValidationErrors({});
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setFormData({
        phone: listing.phone || '',
        email: listing.email || '',
        website: listing.website || ''
      });
    }
    clearError();
    setValidationErrors({});
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateListing({
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website: formData.website ? normalizeWebsiteUrl(formData.website) : undefined
      });

      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [formData, validateForm, updateListing, refreshListing, refreshListings]);

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
    return (
      <div className="text-center py-8 text-gray-600">
        No listing selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
          <p className="text-sm text-gray-500 mt-1">
            Business phone, email, and website displayed on your listing page
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

      {/* Error Display */}
      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* View Mode */}
      {!isEditing ? (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {/* Phone */}
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-5 h-5 text-[#ed6437]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900 mt-0.5">
                {formData.phone ? (
                  <a href={`tel:${formData.phone.replace(/\D/g, '')}`} className="text-[#ed6437] hover:underline">
                    {formatPhoneForDisplay(formData.phone)}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not set</span>
                )}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-[#ed6437]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900 mt-0.5">
                {formData.email ? (
                  <a href={`mailto:${formData.email}`} className="text-[#ed6437] hover:underline">
                    {formData.email}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not set</span>
                )}
              </p>
            </div>
          </div>

          {/* Website */}
          <div className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#ed6437]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-[#ed6437]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Website</label>
              <p className="text-gray-900 mt-0.5">
                {formData.website ? (
                  <a
                    href={normalizeWebsiteUrl(formData.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ed6437] hover:underline"
                  >
                    {formatWebsiteForDisplay(formData.website)}
                  </a>
                ) : (
                  <span className="text-gray-400 italic">Not set</span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                Phone
              </span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g., (555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              maxLength={50}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email
              </span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (validationErrors.email) {
                  setValidationErrors({ ...validationErrors, email: '' });
                }
              }}
              placeholder="e.g., hello@business.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={255}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                Website
              </span>
            </label>
            <input
              type="url"
              id="website"
              value={formData.website}
              onChange={(e) => {
                setFormData({ ...formData, website: e.target.value });
                if (validationErrors.website) {
                  setValidationErrors({ ...validationErrors, website: '' });
                }
              }}
              placeholder="e.g., https://yourbusiness.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                validationErrors.website ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={255}
            />
            {validationErrors.website && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.website}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ContactInfoManager - Wrapped with ErrorBoundary
 */
export function ContactInfoManager() {
  return (
    <ErrorBoundary componentName="ContactInfoManager">
      <ContactInfoManagerContent />
    </ErrorBoundary>
  );
}

export default ContactInfoManager;
