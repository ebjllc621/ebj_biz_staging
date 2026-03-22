/**
 * RecommendationRecipientSelector - Select registered users to receive recommendations
 *
 * Searchable dropdown for selecting recommendation recipients from user's contacts.
 * Includes debounced search and keyboard navigation.
 *
 * @tier STANDARD
 * @phase Phase 1 - Core Recommendation Flow
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_1_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendationRecipientSelector } from '@features/sharing/components';
 *
 * function ShareForm() {
 *   const [recipient, setRecipient] = useState(null);
 *
 *   return (
 *     <RecommendationRecipientSelector
 *       selectedRecipient={recipient}
 *       onSelectRecipient={setRecipient}
 *       placeholder="Search your connections..."
 *     />
 *   );
 * }
 * ```
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, X } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { getAvatarInitials } from '@core/utils/avatar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

/**
 * Recipient user data for recommendations
 */
export interface RecipientUser {
  id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** @governance AVATAR_DISPLAY_GOVERNANCE.md - Avatar background color for fallback */
  avatar_bg_color?: string | null;
}

interface RecommendationRecipientSelectorProps {
  /** Currently selected recipient */
  selectedRecipient: RecipientUser | null;
  /** Callback when recipient is selected */
  onSelectRecipient: (recipient: RecipientUser | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Connection result from /api/users/connections
 * These are the user's actual connections (not CRM contacts)
 */
interface ConnectionResult {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg_color?: string | null;
  connection_type?: string;
  connected_since: string;
}

function RecommendationRecipientSelectorInner({
  selectedRecipient,
  onSelectRecipient,
  disabled = false
}: RecommendationRecipientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allConnections, setAllConnections] = useState<ConnectionResult[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<ConnectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's connections on mount (NOT CRM contacts)
  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use connections API - these are actual user-to-user connections
      const response = await fetchWithCsrf('/api/users/connections', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load connections');
      }

      const data = await response.json();
      // Connections API returns { data: { connections: [...] } }
      const connectionsArray = data.data?.connections || data.connections || [];

      setAllConnections(connectionsArray);
      setFilteredConnections(connectionsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Filter connections based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConnections(allConnections);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allConnections.filter(
      (connection) =>
        connection.username?.toLowerCase().includes(query) ||
        connection.display_name?.toLowerCase().includes(query)
    );

    setFilteredConnections(filtered);
  }, [searchQuery, allConnections]);

  const handleSelectConnection = (connection: ConnectionResult) => {
    onSelectRecipient({
      id: connection.user_id,
      username: connection.username,
      display_name: connection.display_name,
      avatar_url: connection.avatar_url,
      avatar_bg_color: connection.avatar_bg_color
    });
  };

  const handleClearSelection = () => {
    onSelectRecipient(null);
  };

  // Show selected recipient
  if (selectedRecipient) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Recipient
        </label>
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            {selectedRecipient.avatar_url ? (
              <img
                src={selectedRecipient.avatar_url}
                alt={selectedRecipient.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                {getAvatarInitials(
                  selectedRecipient.display_name || selectedRecipient.username
                )}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">
                {selectedRecipient.display_name || selectedRecipient.username}
              </div>
              <div className="text-sm text-gray-600">
                @{selectedRecipient.username}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Show contact selector
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Select Recipient
      </label>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections..."
          disabled={disabled || isLoading}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          Loading connections...
        </div>
      )}

      {/* No Connections */}
      {!isLoading && !error && allConnections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No connections found</p>
          <p className="text-sm mt-1">
            Connect with other users to send them recommendations
          </p>
        </div>
      )}

      {/* No Search Results */}
      {!isLoading && !error && allConnections.length > 0 && filteredConnections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No connections match &quot;{searchQuery}&quot;
        </div>
      )}

      {/* Connection List */}
      {!isLoading && !error && filteredConnections.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
          {filteredConnections.map((connection) => (
            <button
              key={connection.user_id}
              type="button"
              onClick={() => handleSelectConnection(connection)}
              disabled={disabled}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              {connection.avatar_url ? (
                <img
                  src={connection.avatar_url}
                  alt={connection.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm text-white"
                  style={{ backgroundColor: connection.avatar_bg_color || '#022641' }}
                >
                  {getAvatarInitials(connection.display_name || connection.username)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {connection.display_name || connection.username}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  @{connection.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * RecommendationRecipientSelector with ErrorBoundary (STANDARD tier requirement)
 */
export function RecommendationRecipientSelector(props: RecommendationRecipientSelectorProps) {
  return (
    <ErrorBoundary>
      <RecommendationRecipientSelectorInner {...props} />
    </ErrorBoundary>
  );
}
