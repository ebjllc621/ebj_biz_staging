/**
 * RecipientSelector - Search and select message recipients
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/COMPOSE_MESSAGE_RECIPIENT_SELECTION.md
 *
 * GOVERNANCE:
 * - Client Component ('use client')
 * - Tailwind CSS styling with brand colors
 * - Uses existing /api/contacts endpoint
 * - Avatar fallback with initials
 *
 * Features:
 * - Search contacts by name/username
 * - Display matching contacts as selectable cards
 * - Manual username input option
 * - Selected recipient display with change option
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, X } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { getAvatarInitials } from '@core/utils/avatar';

/**
 * Recipient user data for messaging
 */
export interface RecipientUser {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface RecipientSelectorProps {
  /** Currently selected recipient */
  selectedRecipient: RecipientUser | null;
  /** Callback when recipient is selected */
  onSelectRecipient: (recipient: RecipientUser | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

interface ContactResult {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg_color?: string | null;
}

export function RecipientSelector({
  selectedRecipient,
  onSelectRecipient,
  disabled = false
}: RecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState<ContactResult[]>([]); // Full contact list
  const [filteredContacts, setFilteredContacts] = useState<ContactResult[]>([]); // Filtered for display
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUsername, setManualUsername] = useState('');
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);

  // Fetch all contacts on mount (once)
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/contacts', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load contacts');
      }

      const data = await response.json();

      // API response format: { success: true, data: { contacts, total, ... } }
      const contactsArray = data.data?.contacts || data.contacts || [];

      // Filter contacts that can receive messages (connected users only)
      // Keep the order from the API (as arranged in contacts)
      const messageable = contactsArray.filter(
        (c: any) => c.is_connected && c.user_id
      );

      setAllContacts(messageable);
      setFilteredContacts(messageable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load contacts on mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Real-time local filtering as user types (instant, no API call)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // No search query - show all contacts
      setFilteredContacts(allContacts);
    } else {
      // Filter locally for instant feedback
      const lowerQuery = searchQuery.toLowerCase().trim();
      const filtered = allContacts.filter((c) =>
        c.username?.toLowerCase().includes(lowerQuery) ||
        c.display_name?.toLowerCase().includes(lowerQuery)
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, allContacts]);

  // Handle contact selection
  const handleSelectContact = (contact: ContactResult) => {
    onSelectRecipient({
      id: contact.user_id,
      username: contact.username,
      display_name: contact.display_name,
      avatar_url: contact.avatar_url
    });
  };

  // Handle manual username validation and selection
  const handleManualSubmit = async () => {
    if (!manualUsername.trim()) return;

    setIsValidatingUsername(true);
    setError(null);

    try {
      // Look up user by username via their public profile endpoint
      const response = await fetchWithCsrf(`/api/users/${encodeURIComponent(manualUsername.trim())}/profile`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError(`User "@${manualUsername.trim()}" not found`);
        } else {
          throw new Error('Failed to look up user');
        }
        return;
      }

      const data = await response.json();
      // API response format: { success: true, data: { profile, stats, ... } }
      const profile = data.data?.profile || data.profile;
      if (profile) {
        onSelectRecipient({
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        });
        setManualUsername('');
        setShowManualInput(false);
      } else {
        setError(`User "@${manualUsername.trim()}" not found`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up user');
    } finally {
      setIsValidatingUsername(false);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    onSelectRecipient(null);
    setSearchQuery('');
  };

  // If recipient is selected, show selected state
  if (selectedRecipient) {
    const displayName = selectedRecipient.display_name || selectedRecipient.username;
    const initials = getAvatarInitials(displayName, selectedRecipient.username);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          To
        </label>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {selectedRecipient.avatar_url ? (
              <img
                src={selectedRecipient.avatar_url}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-orange-600">
                  {initials}
                </span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500">
              @{selectedRecipient.username}
            </p>
          </div>

          {/* Change button */}
          {!disabled && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  // Recipient selection UI
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        To <span className="text-red-500">*</span>
      </label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-4 text-gray-500">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
          <span className="ml-2">Loading contacts...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Contacts list - shows 3 contacts visible with scroll for more */}
      {!isLoading && filteredContacts.length > 0 && (
        <div
          className="overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100"
          style={{ maxHeight: '192px' }} // Height for exactly 3 contacts (64px each)
        >
          {filteredContacts.map((contact) => {
            const displayName = contact.display_name || contact.username;
            const initials = getAvatarInitials(displayName, contact.username);

            return (
              <button
                key={contact.user_id}
                type="button"
                onClick={() => handleSelectContact(contact)}
                disabled={disabled}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Avatar */}
                {contact.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: contact.avatar_bg_color || '#FED7AA' }}
                  >
                    <span className="text-sm font-semibold text-orange-700">
                      {initials}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{contact.username}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No contacts match search */}
      {!isLoading && filteredContacts.length === 0 && searchQuery && allContacts.length > 0 && (
        <div className="text-center py-4 text-gray-500">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No contacts match "{searchQuery}"</p>
        </div>
      )}

      {/* Empty state - no contacts at all */}
      {!isLoading && allContacts.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No contacts yet</p>
          <p className="text-xs mt-1">Connect with users to message them</p>
        </div>
      )}

      {/* Manual username entry toggle */}
      <div className="pt-2 border-t border-gray-200">
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            disabled={disabled}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Or enter a username manually
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value.replace(/^@/, ''))}
                placeholder="username"
                disabled={disabled || isValidatingUsername}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={disabled || isValidatingUsername || !manualUsername.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {isValidatingUsername ? 'Checking...' : 'Find'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(false);
                setManualUsername('');
                setError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipientSelector;
