/**
 * QuickFactsManager - Manage Basic Business Information
 *
 * @description Edit quick facts: name, slogan, type, year established
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for edit/save buttons
 * - Inline editing pattern (view/edit toggle, no modal)
 * - Uses useListingData hook to fetch FULL listing data
 * - Uses useListingUpdate hook for mutations
 * - Refreshes data after save
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Edit2, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';

// ============================================================================
// TYPES
// ============================================================================

interface QuickFactsFormData {
  name: string;
  slogan: string;
  type: string;
  yearEstablished: number | null;
}

interface TypeOption {
  id: number;
  name: string;
  slug: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function QuickFactsManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<QuickFactsFormData>({
    name: '',
    slogan: '',
    type: '',
    yearEstablished: null
  });
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);

  // Initialize form data from full listing data
  useEffect(() => {
    if (listing) {
      setFormData({
        name: listing.name || '',
        slogan: listing.slogan || '',
        type: listing.type || '',
        yearEstablished: listing.year_established || null
      });
    }
  }, [listing]);

  // Fetch type options from API
  useEffect(() => {
    async function fetchTypes() {
      try {
        const response = await fetch('/api/types', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setTypeOptions(data.data?.types || []);
        }
      } catch {
        // Silently fail - dropdown will show empty or current value
      }
    }
    fetchTypes();
  }, []);

  const handleEdit = useCallback(() => {
    clearError();
    setIsEditing(true);
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (listing) {
      setFormData({
        name: listing.name || '',
        slogan: listing.slogan || '',
        type: listing.type || '',
        yearEstablished: listing.year_established || null
      });
    }
    clearError();
    setIsEditing(false);
  }, [listing, clearError]);

  const handleSave = useCallback(async () => {
    try {
      await updateListing({
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        type: formData.type || undefined,
        year_established: formData.yearEstablished,
        slogan: formData.slogan || undefined
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
        <h2 className="text-xl font-semibold text-gray-900">Quick Facts</h2>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <p className="text-gray-900">{formData.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
            <p className="text-gray-900">{formData.slogan || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
            <p className="text-gray-900">{formData.type || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year Established</label>
            <p className="text-gray-900">{formData.yearEstablished || 'Not set'}</p>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Business Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
              Slogan
            </label>
            <input
              type="text"
              id="slogan"
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              maxLength={500}
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Business Type
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="">Select type...</option>
              {typeOptions.map((typeOption) => (
                <option key={typeOption.id} value={typeOption.name}>
                  {typeOption.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="yearEstablished" className="block text-sm font-medium text-gray-700 mb-1">
              Year Established
            </label>
            <input
              type="number"
              id="yearEstablished"
              value={formData.yearEstablished || ''}
              onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              min={1800}
              max={new Date().getFullYear()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * QuickFactsManager - Wrapped with ErrorBoundary
 */
export function QuickFactsManager() {
  return (
    <ErrorBoundary componentName="QuickFactsManager">
      <QuickFactsManagerContent />
    </ErrorBoundary>
  );
}

export default QuickFactsManager;
