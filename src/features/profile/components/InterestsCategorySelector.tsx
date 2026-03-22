/**
 * InterestsCategorySelector - Category-based Interest Selector
 *
 * Features:
 * - Debounced search autocomplete
 * - Hierarchical category path display
 * - Selected interests as badges with delete
 * - Integration with CategoryService
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3A_BRAIN_PLAN.md
 * @tier ADVANCED
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import type { CategoryInterest, CategorySearchResult } from '../types/user-interests';

interface InterestsCategorySelectorProps {
  /** Current category interests */
  interests: CategoryInterest[];
  /** Callback when interests change */
  onInterestsChange: (_interests: CategoryInterest[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Maximum number of category interests allowed */
  maxInterests?: number;
  /** Target user's username for API calls (admin editing support) */
  username: string;
}

export function InterestsCategorySelector({
  interests,
  onInterestsChange,
  disabled = false,
  maxInterests = 20,
  username
}: InterestsCategorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CategorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced category search
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
        const response = await fetch(
          `/api/users/interests/search?q=${encodeURIComponent(searchQuery)}`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.categories) {
            setSearchResults(result.data.categories);
            setShowResults(true);
          }
        } else {
          setError('Failed to search categories');
        }
      } catch (err) {
        console.error('Category search error:', err);
        setError('Search failed. Please try again.');
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

  // Check if category is already selected
  const isCategorySelected = useCallback((categoryId: number): boolean => {
    return interests.some(i => i.category_id === categoryId);
  }, [interests]);

  // Handle category selection
  const handleSelectCategory = useCallback(async (category: CategorySearchResult) => {
    if (isCategorySelected(category.id)) {
      return; // Already selected
    }

    if (interests.length >= maxInterests) {
      setError(`Maximum ${maxInterests} category interests allowed`);
      return;
    }

    setError(null);

    try {
      // GOVERNANCE: CSRF token required for POST requests to withCsrf-protected endpoints
      // Uses username-based endpoint to support admin editing other users
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'x-csrf-token': csrfToken })
        },
        credentials: 'include',
        body: JSON.stringify({ category_id: category.id })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.interest) {
          onInterestsChange([...interests, result.data.interest]);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error?.message || 'Failed to add interest');
      }
    } catch (err) {
      console.error('Add interest error:', err);
      setError('Failed to add interest. Please try again.');
    }

    setSearchQuery('');
    setShowResults(false);
    searchInputRef.current?.focus();
  }, [interests, maxInterests, onInterestsChange, isCategorySelected, username]);

  // Handle interest removal
  // Uses username-based endpoint to support admin editing other users
  const handleRemoveInterest = useCallback(async (interestId: number) => {
    try {
      // GOVERNANCE: CSRF token required for DELETE requests to withCsrf-protected endpoints
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/interests/${interestId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {}
      });

      if (response.ok) {
        onInterestsChange(interests.filter(i => i.id !== interestId));
      } else {
        setError('Failed to remove interest');
      }
    } catch (err) {
      console.error('Remove interest error:', err);
      setError('Failed to remove interest. Please try again.');
    }
  }, [interests, onInterestsChange, username]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories to add as interests..."
            disabled={disabled || interests.length >= maxInterests}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437]
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Search categories"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#ed6437] animate-spin" />
          )}
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
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50
                         disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                         border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="text-sm font-medium text-[#022641]">
                  {category.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {category.fullPath}
                </div>
                {isCategorySelected(category.id) && (
                  <span className="text-xs text-green-600 font-medium">✓ Already added</span>
                )}
              </button>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              No categories found for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Selected Interests Badges */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <CategoryInterestBadge
              key={interest.id}
              interest={interest}
              onRemove={() => handleRemoveInterest(interest.id)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Interest Count */}
      <p className="text-xs text-gray-500">
        {interests.length} of {maxInterests} category interests selected
      </p>
    </div>
  );
}

// ==========================================================================
// CategoryInterestBadge Sub-component
// ==========================================================================

interface CategoryInterestBadgeProps {
  interest: CategoryInterest;
  onRemove: () => void;
  disabled?: boolean;
}

function CategoryInterestBadge({ interest, onRemove, disabled }: CategoryInterestBadgeProps) {
  return (
    <div className="group relative">
      {/* Main Badge */}
      <span className="inline-flex items-center gap-1.5 bg-[#ed6437] text-white
                      px-3 py-1.5 rounded-full text-sm font-medium">
        {interest.category_name}
        {!disabled && (
          <button
            type="button"
            onClick={onRemove}
            className="text-white/80 hover:text-white transition-colors ml-0.5"
            aria-label={`Remove ${interest.category_name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </span>

      {/* Tooltip showing full path */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                    bg-[#022641] text-white text-xs rounded whitespace-nowrap
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
        {interest.category_path}
        <div className="absolute top-full left-1/2 -translate-x-1/2
                      border-4 border-transparent border-t-[#022641]" />
      </div>
    </div>
  );
}
