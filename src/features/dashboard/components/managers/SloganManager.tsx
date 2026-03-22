/**
 * SloganManager - Manage Business Slogan
 *
 * @description Edit business slogan/tagline with character counter
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Listing Manager Pages
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for edit/save buttons
 * - Inline editing pattern (view/edit toggle, no modal)
 * - Uses useListingData hook to fetch FULL listing data
 * - Uses useListingUpdate hook for mutations
 * - Refreshes data after save
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, Loader2, Quote } from 'lucide-react';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SLOGAN_LENGTH = 200;

// ============================================================================
// COMPONENT
// ============================================================================

export function SloganManager() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [slogan, setSlogan] = useState('');

  // Initialize form data from listing
  useEffect(() => {
    if (listing) {
      setSlogan(listing.slogan || '');
    }
  }, [listing]);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setSlogan(listing.slogan || '');
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      await updateListing({
        slogan: slogan.trim() || undefined
      });

      await refreshListing();
      await refreshListings();
      setIsEditing(false);
    } catch {
      // Error already set in hook
    }
  }, [slogan, updateListing, refreshListing, refreshListings]);

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
        <h2 className="text-xl font-semibold text-gray-900">Business Slogan</h2>
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

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Your slogan is a short, memorable tagline that captures the essence of your business.
          It appears prominently on your listing page and helps visitors quickly understand what makes you unique.
        </p>
      </div>

      {/* View Mode */}
      {!isEditing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {slogan ? (
            <div className="flex items-start gap-4">
              <Quote className="w-8 h-8 text-[#ed6437] flex-shrink-0" />
              <blockquote className="text-xl font-medium text-gray-900 italic flex-1">
                "{slogan}"
              </blockquote>
              <Quote className="w-8 h-8 text-[#ed6437] flex-shrink-0 transform rotate-180" />
            </div>
          ) : (
            <p className="text-gray-500 italic">No slogan set</p>
          )}
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          <div>
            <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
              Slogan
            </label>
            <textarea
              id="slogan"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              rows={3}
              maxLength={MAX_SLOGAN_LENGTH}
              placeholder="Enter your business slogan..."
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                A memorable tagline for your business
              </p>
              <p className={`text-xs ${slogan.length > MAX_SLOGAN_LENGTH * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                {slogan.length}/{MAX_SLOGAN_LENGTH}
              </p>
            </div>
          </div>

          {/* Preview */}
          {slogan && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <Quote className="w-6 h-6 text-[#ed6437] flex-shrink-0" />
                  <blockquote className="text-lg font-medium text-gray-900 italic flex-1">
                    "{slogan}"
                  </blockquote>
                  <Quote className="w-6 h-6 text-[#ed6437] flex-shrink-0 transform rotate-180" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SloganManager;
