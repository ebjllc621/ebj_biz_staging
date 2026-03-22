/**
 * CategoriesManager - Manage Categories & Keywords
 *
 * @description Full category selector with drag-and-drop, search, tier limits,
 *   and auto-populated keywords. Replicates the modal's CategorySelector behavior.
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages (Rebuilt)
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 * @reference src/features/listings/components/NewListingModal/shared/CategorySelector/CategorySelector.tsx
 */
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Check, AlertCircle, Tag, Loader2, Save } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { useListingUpdate } from '@features/dashboard/hooks/useListingUpdate';
import { CategorySelector } from '@features/listings/components/NewListingModal/shared/CategorySelector/CategorySelector';
import type { Category, TierLimits, ListingTier } from '@features/listings/types/listing-form.types';
import { TIER_LIMITS } from '@features/listings/types/listing-form.types';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get tier limits for a listing tier string
 */
function getTierLimitsForTier(tier: string | null): TierLimits {
  const validTier = (tier && tier in TIER_LIMITS) ? tier as ListingTier : 'essentials';
  return TIER_LIMITS[validTier];
}

// ============================================================================
// COMPONENT
// ============================================================================

function CategoriesManagerContent() {
  const { selectedListingId, refreshListings } = useListingContext();
  const { listing, isLoading: isLoadingData, error: loadError, refreshListing } = useListingData(selectedListingId);
  const { updateListing, isUpdating, error: updateError, clearError } = useListingUpdate(selectedListingId);

  // Category state (full Category objects for the CategorySelector)
  const [activeCategories, setActiveCategories] = useState<Category[]>([]);
  const [bankCategories, setBankCategories] = useState<Category[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);

  // Track previous active category IDs for keyword auto-population
  const prevActiveIdsRef = useRef<Set<number>>(new Set());

  // Hydrate category IDs into full Category objects from the API
  const hydrateCategories = useCallback(async (categoryIds: number[]): Promise<Category[]> => {
    if (categoryIds.length === 0) return [];

    try {
      // Fetch all categories to build the map
      const response = await fetch('/api/categories?isActive=true', {
        credentials: 'include'
      });
      if (!response.ok) return [];

      const result = await response.json();
      if (!result.success || !result.data?.categories) return [];

      const allCategories: Category[] = result.data.categories;
      const categoryMap = new Map(allCategories.map((c: Category) => [c.id, c]));

      // Map IDs to full objects
      return categoryIds
        .map(id => categoryMap.get(id))
        .filter((c): c is Category => c !== undefined);
    } catch {
      return [];
    }
  }, []);

  // Initialize from listing data - hydrate IDs to full Category objects
  useEffect(() => {
    if (!listing) return;

    const initCategories = async () => {
      setIsHydrating(true);
      try {
        const activeIds = listing.active_categories || [];
        const bankIds = listing.bank_categories || [];
        const allIds = [...activeIds, ...bankIds];

        if (allIds.length > 0) {
          const hydrated = await hydrateCategories(allIds);
          const hydratedMap = new Map(hydrated.map(c => [c.id, c]));

          const hydratedActive = activeIds
            .map(id => hydratedMap.get(id))
            .filter((c): c is Category => c !== undefined);
          const hydratedBank = bankIds
            .map(id => hydratedMap.get(id))
            .filter((c): c is Category => c !== undefined);

          setActiveCategories(hydratedActive);
          setBankCategories(hydratedBank);

          // Set initial tracking for keyword auto-population
          prevActiveIdsRef.current = new Set(activeIds);
        } else {
          setActiveCategories([]);
          setBankCategories([]);
          prevActiveIdsRef.current = new Set();
        }

        setKeywords(listing.keywords || []);
        setHasChanges(false);
      } finally {
        setIsHydrating(false);
      }
    };

    void initCategories();
  }, [listing, hydrateCategories]);

  // Handle category updates from CategorySelector (with keyword auto-population)
  const handleCategoriesUpdate = useCallback((active: Category[], bank: Category[]) => {
    // Detect newly added categories for keyword auto-population
    const previousActiveIds = prevActiveIdsRef.current;
    const newCategories = active.filter(c => !previousActiveIds.has(c.id));

    // Collect keywords from newly added categories
    const newKeywordsToAdd: string[] = [];
    for (const category of newCategories) {
      if (category.keywords && Array.isArray(category.keywords)) {
        for (const keyword of category.keywords) {
          if (keyword && !keywords.includes(keyword) && !newKeywordsToAdd.includes(keyword)) {
            newKeywordsToAdd.push(keyword);
          }
        }
      }
    }

    // Auto-add category keywords
    if (newKeywordsToAdd.length > 0) {
      setKeywords(prev => [...prev, ...newKeywordsToAdd]);
    }

    // Update tracking ref
    prevActiveIdsRef.current = new Set(active.map(c => c.id));

    setActiveCategories(active);
    setBankCategories(bank);
    setHasChanges(true);
  }, [keywords]);

  // Manual keyword management
  const handleAddKeyword = useCallback(() => {
    const keyword = keywordInput.trim();
    if (keyword && !keywords.includes(keyword)) {
      setKeywords(prev => [...prev, keyword]);
      setKeywordInput('');
      setHasChanges(true);
    }
  }, [keywordInput, keywords]);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
    setHasChanges(true);
  }, []);

  // Save all changes
  const handleSave = useCallback(async () => {
    try {
      clearError();
      const activeIds = activeCategories.map(c => c.id);
      const bankIds = bankCategories.map(c => c.id);

      await updateListing({
        active_categories: activeIds,
        bank_categories: bankIds,
        category_ids: activeIds, // Also update primary category_id via existing handler
        keywords: keywords
      });
      await refreshListing();
      await refreshListings();
      setHasChanges(false);
    } catch {
      // Error already set in hook
    }
  }, [activeCategories, bankCategories, keywords, updateListing, refreshListing, refreshListings, clearError]);

  // Cancel changes - reset to listing data
  const handleCancel = useCallback(() => {
    if (listing) {
      // Re-trigger hydration by resetting from listing
      const activeIds = listing.active_categories || [];
      const bankIds = listing.bank_categories || [];

      // Quick re-hydrate from current state
      const currentMap = new Map([
        ...activeCategories.map(c => [c.id, c] as [number, Category]),
        ...bankCategories.map(c => [c.id, c] as [number, Category])
      ]);

      setActiveCategories(activeIds.map(id => currentMap.get(id)).filter((c): c is Category => c !== undefined));
      setBankCategories(bankIds.map(id => currentMap.get(id)).filter((c): c is Category => c !== undefined));
      setKeywords(listing.keywords || []);
      prevActiveIdsRef.current = new Set(activeIds);
      setHasChanges(false);
    }
    clearError();
  }, [listing, activeCategories, bankCategories, clearError]);

  // Get tier limits
  const tierLimits = getTierLimitsForTier(listing?.tier || null);

  // Loading state
  if (isLoadingData || isHydrating) {
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

  return (
    <div className="space-y-6">
      {/* Section Header with Save/Cancel */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Categories & Keywords</h2>
        {hasChanges && (
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
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Tier Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong className="capitalize">{listing.tier}</strong> tier: up to{' '}
          <strong>{tierLimits.categories}</strong> active categories and{' '}
          <strong>{tierLimits.bankCategories}</strong> bank categories ({tierLimits.categories + tierLimits.bankCategories} total).
        </p>
      </div>

      {/* Error Display */}
      {updateError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      {/* Category Selector (same as modal) */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-semibold text-[#022641] mb-3">Categories</h3>
        <CategorySelector
          activeCategories={activeCategories}
          bankCategories={bankCategories}
          onUpdateCategories={handleCategoriesUpdate}
          tierLimits={tierLimits}
        />
      </div>

      {/* Keywords Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-base font-semibold text-[#022641] mb-3">Keywords</h3>
        <p className="text-sm text-gray-500 mb-3">
          Keywords are auto-populated from selected categories. You can also add custom keywords.
        </p>

        {/* Add keyword input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddKeyword();
              }
            }}
            placeholder="Enter keyword and press Enter"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!keywordInput.trim()}
            className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Keyword badges */}
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {keyword}
                <button
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="ml-1 text-gray-500 hover:text-red-600"
                  aria-label={`Remove ${keyword}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No keywords yet. Add categories to auto-populate, or type your own.</p>
        )}
      </div>

      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">You have unsaved changes.</span>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="ml-auto flex items-center gap-1 px-3 py-1 bg-[#ed6437] text-white rounded text-sm hover:bg-[#d55a31] disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export function CategoriesManager() {
  return (
    <ErrorBoundary componentName="CategoriesManager">
      <CategoriesManagerContent />
    </ErrorBoundary>
  );
}

export default CategoriesManager;
