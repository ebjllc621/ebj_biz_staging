/**
 * AttendeeInviteModal - Invite platform users to attend an event
 *
 * Flow:
 * 1. Search users by name/email (autocomplete, debounced)
 * 2. Select multiple users (chip display)
 * 3. Optional: write personal message
 * 4. Submit via fetchWithCsrf
 * 5. Show results summary (N invited, N skipped)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8 - Polish + KPI Dashboard (FM 4.6)
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, Loader2, CheckCircle, X, UserPlus } from 'lucide-react';

interface UserSearchResult {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
}

interface AttendeeInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  onInvitesSent?: (count: number) => void;
}

interface InviteResult {
  invited: number;
  skipped: number;
  errors: number;
}

function AttendeeInviteModalContent({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onInvitesSent,
}: AttendeeInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setMessage('');
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  // Autocomplete search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/events/${eventId}/attendees/invite?q=${encodeURIComponent(searchQuery)}`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          const users = data?.data?.users || [];
          // Filter out already-selected users
          const selectedIds = new Set(selectedUsers.map(u => u.id));
          setSearchResults(
            Array.isArray(users)
              ? users.filter((u: UserSearchResult) => !selectedIds.has(u.id))
              : []
          );
        }
      } catch {
        // Silently fail search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, eventId, selectedUsers]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to invite');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/attendees/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: selectedUsers.map(u => u.id),
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || data?.error || 'Failed to send invitations');
        return;
      }

      const inviteResult: InviteResult = data?.data || { invited: 0, skipped: 0, errors: 0 };
      setResult(inviteResult);

      if (onInvitesSent && inviteResult.invited > 0) {
        onInvitesSent(inviteResult.invited);
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Attendees to "${eventTitle}"`}
      maxWidth="md"
    >
      {result ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">Invitations Sent!</p>
          <div className="text-sm text-gray-600 space-y-1">
            {result.invited > 0 && (
              <p>{result.invited} invitation{result.invited !== 1 ? 's' : ''} sent successfully</p>
            )}
            {result.skipped > 0 && (
              <p className="text-gray-500">{result.skipped} skipped (already RSVP&apos;d or recently invited)</p>
            )}
            {result.errors > 0 && (
              <p className="text-red-500">{result.errors} failed to send</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* User search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Users <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
              />
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg shadow-sm overflow-hidden max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected users chips */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-full text-xs font-medium"
                  >
                    {user.display_name || user.username}
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="hover:text-orange-900 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personal message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., We'd love for you to join us at this event..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{message.length}/500 characters</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedUsers.length === 0}
              className="flex-1 px-4 py-2 bg-biz-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Invite {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}

export function AttendeeInviteModal(props: AttendeeInviteModalProps) {
  return (
    <ErrorBoundary>
      <AttendeeInviteModalContent {...props} />
    </ErrorBoundary>
  );
}
