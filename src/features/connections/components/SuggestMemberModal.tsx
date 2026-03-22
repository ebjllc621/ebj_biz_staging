/**
 * SuggestMemberModal Component
 * Modal for non-owner members to suggest adding a connection to the group
 *
 * @tier STANDARD
 * @phase Connection Groups - Member Suggestions
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, UserPlus } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { UserConnection } from '../types';
import type { GroupMember } from '../types/groups';

export interface SuggestMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  existingMembers: GroupMember[];
  onSuggestionSent: () => void;
}

export function SuggestMemberModal({
  isOpen,
  onClose,
  groupId,
  groupName,
  existingMembers,
  onSuggestionSent
}: SuggestMemberModalProps) {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConnections();
      setSelectedUserId(null);
      setSearchQuery('');
      setMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/connections', { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setConnections(result.data.connections || []);
      }
    } catch {
      setError('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const existingIds = useMemo(() => new Set(existingMembers.map(m => m.memberUserId)), [existingMembers]);

  const filteredConnections = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return connections.filter(c => {
      if (existingIds.has(c.user_id)) return false;
      if (!query) return true;
      return (
        c.username.toLowerCase().includes(query) ||
        (c.display_name || '').toLowerCase().includes(query)
      );
    });
  }, [connections, searchQuery, existingIds]);

  const handleSubmit = async () => {
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/users/connections/groups/${groupId}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestedUserId: selectedUserId,
          message: message.trim() || undefined
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuggestionSent();
          onClose();
        }, 1500);
      } else {
        const result = await res.json();
        setError(result.error?.message || 'Failed to send suggestion');
      }
    } catch {
      setError('Failed to send suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Suggest Member for ${groupName}`}
    >
      <div className="p-4 space-y-4">
        {success ? (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-green-700 font-medium">Suggestion sent!</p>
            <p className="text-sm text-gray-500 mt-1">The group owner will review your suggestion.</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your connections..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Connection List */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading connections...</div>
              ) : filteredConnections.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? 'No matching connections' : 'No available connections to suggest'}
                </div>
              ) : (
                filteredConnections.map((conn) => (
                  <button
                    key={conn.user_id}
                    onClick={() => setSelectedUserId(conn.user_id === selectedUserId ? null : conn.user_id)}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selectedUserId === conn.user_id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {conn.avatar_url ? (
                      <img src={conn.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: conn.avatar_bg_color || '#3B82F6' }}
                      >
                        {getAvatarInitials(conn.display_name || conn.username)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{conn.display_name || conn.username}</p>
                      <p className="text-xs text-gray-500 truncate">@{conn.username}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedUserId === conn.user_id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {selectedUserId === conn.user_id && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for suggestion <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why should this person be added to the group?"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedUserId || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : 'Send Suggestion'}
              </button>
            </div>
          </>
        )}
      </div>
    </BizModal>
  );
}
