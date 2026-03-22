/**
 * CategorySelector - Drag-and-Drop Category Management
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ADVANCED
 * @phase Phase 3 - Section 2 Basic Information
 *
 * FEATURES:
 * - Search input with debounced autocomplete
 * - Active categories zone (tier-based limit)
 * - Bank categories zone (overflow storage)
 * - Drag-and-drop between zones
 * - Parent category auto-selection
 * - Tier-based limits display
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Category, TierLimits } from '../../../../types/listing-form.types';
import { useCategoryDragDrop } from './useCategoryDragDrop';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPES
// ============================================================================

export interface CategorySelectorProps {
  activeCategories: Category[];
  bankCategories: Category[];
  onUpdateCategories: (_active: Category[], _bank: Category[]) => void;
  tierLimits: TierLimits;
}

// Extended type for API search results that include ancestors and keywords
interface CategoryWithAncestors extends Category {
  ancestors?: Category[];
  keywords?: string[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CategorySelector({
  activeCategories,
  bankCategories,
  onUpdateCategories,
  tierLimits
}: CategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CategoryWithAncestors[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalCategoryLimit = tierLimits.categories + tierLimits.bankCategories;

  const {
    draggedFrom,
    handleDragStart,
    handleDragEnd,
    handleDropInActive,
    handleDropInBank,
    removeFromActive,
    removeFromBank,
    addToActive,
    isCategorySelected
  } = useCategoryDragDrop({
    activeCategories,
    bankCategories,
    onUpdateCategories,
    activeCategoryLimit: tierLimits.categories,
    totalCategoryLimit
  });

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/categories?search=${encodeURIComponent(searchQuery)}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.categories) {
            setSearchResults(result.data.categories);
            setShowResults(true);
          }
        }
      } catch (err) {
        ErrorService.capture('Category search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle category selection from search
  // Adds the selected category AND all its ancestors to active categories
  // NOTE: Must batch all additions into single state update to avoid stale closure issues
  const handleSelectCategory = useCallback((category: CategoryWithAncestors) => {
    // Collect all categories to add (ancestors + selected category)
    const categoriesToAdd: Category[] = [];

    // Get existing selected IDs for deduplication
    const existingIds = new Set([
      ...activeCategories.map(c => c.id),
      ...bankCategories.map(c => c.id)
    ]);

    // Add ancestors first (from root to immediate parent)
    if (category.ancestors && category.ancestors.length > 0) {
      for (const ancestor of category.ancestors) {
        if (!existingIds.has(ancestor.id)) {
          // Include keywords from ancestor
          categoriesToAdd.push({
            id: ancestor.id,
            name: ancestor.name,
            slug: ancestor.slug,
            parentId: ancestor.parentId,
            fullPath: ancestor.fullPath,
            keywords: ancestor.keywords || []
          });
          existingIds.add(ancestor.id); // Track to avoid duplicates within batch
        }
      }
    }

    // Add the selected category itself
    if (!existingIds.has(category.id)) {
      // Create a clean category object with keywords but without ancestors
      categoriesToAdd.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        fullPath: category.fullPath,
        keywords: category.keywords || []
      });
    }

    // Batch add ALL categories in a single state update
    if (categoriesToAdd.length > 0) {
      // Calculate how many can go to active vs bank
      const activeAvailable = tierLimits.categories - activeCategories.length;
      const totalAvailable = totalCategoryLimit - (activeCategories.length + bankCategories.length);

      // Take only what we can fit
      const toAdd = categoriesToAdd.slice(0, totalAvailable);

      // Split between active and bank based on available space
      const toActive = toAdd.slice(0, activeAvailable);
      const toBank = toAdd.slice(activeAvailable);

      // Single state update with all new categories
      const newActive = [...activeCategories, ...toActive];
      const newBank = [...bankCategories, ...toBank];

      onUpdateCategories(newActive, newBank);
    }

    setSearchQuery('');
    setShowResults(false);
    searchInputRef.current?.focus();
  }, [activeCategories, bankCategories, tierLimits.categories, totalCategoryLimit, onUpdateCategories]);

  // Handle drag over events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]"
            aria-label="Search categories"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelectCategory(category)}
                disabled={isCategorySelected(category.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                <div className="text-sm font-medium text-[#022641]">
                  {category.name}
                </div>
                {category.fullPath && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {category.fullPath}
                  </div>
                )}
                {isCategorySelected(category.id) && (
                  <span className="text-xs text-green-600 ml-2">Selected</span>
                )}
              </button>
            ))}
          </div>
        )}

        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-[#ed6437]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Category Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Categories Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropInActive}
          className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] ${
            draggedFrom === 'bank' ? 'border-[#ed6437] bg-orange-50' : 'border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#022641]">
              Active Categories
            </h4>
            <span className={`text-xs font-medium ${
              activeCategories.length >= tierLimits.categories
                ? 'text-red-600'
                : 'text-gray-600'
            }`}>
              {activeCategories.length} / {tierLimits.categories}
            </span>
          </div>

          <div className="space-y-2">
            {activeCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                Drag categories here or search to add
              </div>
            ) : (
              activeCategories.map((category) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart(category, 'active')}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded cursor-move hover:border-[#ed6437] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg className="h-4 w-4 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span className="text-sm text-[#022641] truncate">
                      {category.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromActive(category.id)}
                    className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                    aria-label={`Remove ${category.name}`}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bank Categories Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropInBank}
          className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] ${
            draggedFrom === 'active' ? 'border-[#ed6437] bg-orange-50' : 'border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-[#022641]">
              Bank Categories
            </h4>
            <span className={`text-xs font-medium ${
              bankCategories.length >= tierLimits.bankCategories
                ? 'text-red-600'
                : 'text-gray-600'
            }`}>
              {bankCategories.length} / {tierLimits.bankCategories}
            </span>
          </div>

          <div className="space-y-2">
            {bankCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                Overflow categories storage
              </div>
            ) : (
              bankCategories.map((category) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart(category, 'bank')}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded cursor-move hover:border-[#ed6437] hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg className="h-4 w-4 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    <span className="text-sm text-gray-600 truncate">
                      {category.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromBank(category.id)}
                    className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                    aria-label={`Remove ${category.name}`}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          Active categories appear on your listing. Bank categories are stored for quick access.
        </p>
        <p>
          Total limit: {activeCategories.length + bankCategories.length} / {totalCategoryLimit} categories
        </p>
      </div>
    </div>
  );
}
