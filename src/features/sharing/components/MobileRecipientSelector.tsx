/**
 * MobileRecipientSelector - Full-screen recipient search for mobile
 *
 * Full-screen search overlay with large touch targets and recent recipients section.
 * Keyboard-optimized with instant search results.
 *
 * @tier STANDARD
 * @phase Phase 9 - Mobile Experience
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { MobileRecipientSelector } from '@features/sharing/components';
 *
 * function MobileShareSheet() {
 *   const [showSearch, setShowSearch] = useState(false);
 *   const [recipient, setRecipient] = useState(null);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setShowSearch(true)}>Select Recipient</Button>
 *       <MobileRecipientSelector
 *         isOpen={showSearch}
 *         onClose={() => setShowSearch(false)}
 *         onSelect={(user) => {
 *           setRecipient(user);
 *           setShowSearch(false);
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Clock, Check } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { getAvatarInitials } from '@/core/utils/avatar';
import type { RecipientUser } from './RecommendationRecipientSelector';

interface MobileRecipientSelectorProps {
  /** Whether the selector is open */
  isOpen: boolean;
  /** Callback to close the selector */
  onClose: () => void;
  /** Currently selected recipient */
  selectedRecipient: RecipientUser | null;
  /** Callback when recipient is selected */
  onSelectRecipient: (recipient: RecipientUser) => void;
}

function MobileRecipientSelectorInner({
  isOpen,
  onClose,
  selectedRecipient,
  onSelectRecipient
}: MobileRecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RecipientUser[]>([]);
  const [recentRecipients, setRecentRecipients] = useState<RecipientUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch recent recipients on mount
  useEffect(() => {
    if (isOpen) {
      fetchRecentRecipients();
    }
  }, [isOpen]);

  const fetchRecentRecipients = async () => {
    try {
      const response = await fetchWithCsrf('/api/sharing/recipients/recent', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setRecentRecipients(data.recipients || data.data?.recipients || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent recipients:', err);
    }
  };

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetchWithCsrf(
          `/api/sharing/recipients/search?q=${encodeURIComponent(searchQuery)}`,
          {
            method: 'GET',
            credentials: 'include'
          }
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.recipients || data.data?.recipients || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectRecipient = useCallback((recipient: RecipientUser) => {
    onSelectRecipient(recipient);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onClose();
  }, [onSelectRecipient, onClose]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleClose = () => {
    setSearchQuery('');
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  const displayResults = searchQuery.trim() ? results : recentRecipients;
  const showRecentLabel = !searchQuery.trim() && recentRecipients.length > 0;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">
          Select Recipient
        </h2>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            autoFocus
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            style={{ fontSize: '16px' }} // Prevents zoom on iOS
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {showRecentLabel && (
          <div className="px-4 py-2 flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Recent recipients</span>
          </div>
        )}

        {isSearching && (
          <div className="text-center py-12 text-gray-500">
            Searching...
          </div>
        )}

        {!isSearching && displayResults.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12 text-gray-500">
            No connections found matching &quot;{searchQuery}&quot;
          </div>
        )}

        {!isSearching && displayResults.length === 0 && !searchQuery.trim() && (
          <div className="text-center py-12 text-gray-500">
            Start typing to search your connections
          </div>
        )}

        {/* Recipient List */}
        <div className="divide-y divide-gray-100">
          {displayResults.map((user) => {
            const isSelected = selectedRecipient?.id === user.id;

            return (
              <button
                key={user.id}
                onClick={() => handleSelectRecipient(user)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[68px]"
              >
                {/* Avatar */}
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name || user.username}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{ backgroundColor: user.avatar_bg_color || '#6366f1' }}
                  >
                    {getAvatarInitials(user.display_name || user.username)}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-gray-900 truncate">
                    {user.display_name || user.username}
                  </p>
                  {user.display_name && (
                    <p className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </p>
                  )}
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                  <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * MobileRecipientSelector with ErrorBoundary (STANDARD tier requirement)
 */
export function MobileRecipientSelector(props: MobileRecipientSelectorProps) {
  return (
    <ErrorBoundary>
      <MobileRecipientSelectorInner {...props} />
    </ErrorBoundary>
  );
}
