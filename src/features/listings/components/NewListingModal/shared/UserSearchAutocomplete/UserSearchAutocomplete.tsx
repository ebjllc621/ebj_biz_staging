/**
 * UserSearchAutocomplete - Admin user search with autocomplete
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD
 * @phase New Listing Modal Enhancement
 *
 * FEATURES:
 * - Debounced search by user ID, email, username, or display name
 * - Dropdown autocomplete results
 * - Deletable badge for selected user
 * - Admin-only component
 *
 * @reference src/features/listings/components/NewListingModal/shared/CategorySelector/CategorySelector.tsx - autocomplete pattern
 * @reference src/features/contacts/components/ContactTagInput.tsx - badge/tag pattern
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AssignedUser } from '../../../../types/listing-form.types';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TYPES
// ============================================================================

export interface UserSearchAutocompleteProps {
  selectedUser: AssignedUser | null;
  onUserSelect: (_user: AssignedUser | null) => void;
  disabled?: boolean;
}

interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UserSearchAutocomplete({
  selectedUser,
  onUserSelect,
  disabled = false
}: UserSearchAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        const response = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.users) {
            setSearchResults(result.data.users);
            setShowResults(true);
          }
        }
      } catch (err) {
        ErrorService.capture('User search error:', err);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user selection
  const handleSelectUser = useCallback((user: UserSearchResult) => {
    onUserSelect({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name
    });
    setSearchQuery('');
    setShowResults(false);
  }, [onUserSelect]);

  // Handle remove user
  const handleRemoveUser = useCallback(() => {
    onUserSelect(null);
    searchInputRef.current?.focus();
  }, [onUserSelect]);

  // If user is selected, show the badge
  if (selectedUser) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[#022641] text-white px-3 py-2 rounded-lg">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {selectedUser.displayName || selectedUser.username}
            </span>
            <span className="text-xs opacity-80">
              {selectedUser.email} (ID: {selectedUser.id})
            </span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemoveUser}
              className="ml-2 text-white hover:text-red-300 transition-colors"
              aria-label="Remove selected user"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
          placeholder="Search by ID, email, username, or name..."
          disabled={disabled}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Search users"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-[#ed6437]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[#022641]">
                    {user.display_name || user.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user.email}
                  </div>
                </div>
                <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  ID: {user.id}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No users found matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

export default UserSearchAutocomplete;
