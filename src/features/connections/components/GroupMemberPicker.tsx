/**
 * GroupMemberPicker Component
 * Modal for selecting connections to add to a group
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - Uses BizModal for branded modal experience
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionsListPanel.tsx
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, Users, UserPlus } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { UserConnection } from '../types';
import type { GroupMember } from '../types/groups';

export interface GroupMemberPickerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  existingMembers: GroupMember[];
  onMembersAdded: () => void;
}

export function GroupMemberPicker({
  isOpen,
  onClose,
  groupId,
  groupName,
  existingMembers,
  onMembersAdded
}: GroupMemberPickerProps) {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load connections when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConnections();
      setSelectedIds(new Set());
      setSearchQuery('');
      setError(null);
    }
  }, [isOpen]);

  const loadConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const response = await fetch('/api/users/connections', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setConnections(result.data.connections || []);
      }
    } catch (err) {
      setError('Failed to load connections');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Filter out existing members
  const availableConnections = useMemo(() => {
    const existingIds = new Set(existingMembers.map(m => m.memberUserId));
    return connections.filter(conn => !existingIds.has(conn.user_id));
  }, [connections, existingMembers]);

  // Apply search filter
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return availableConnections;

    const query = searchQuery.toLowerCase();
    return availableConnections.filter(conn =>
      conn.username.toLowerCase().includes(query) ||
      conn.display_name?.toLowerCase().includes(query)
    );
  }, [availableConnections, searchQuery]);

  const handleToggleSelection = (userId: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedIds(newSelection);
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberIds: Array.from(selectedIds) })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to add members');
      }

      // Success
      onMembersAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Members to ${groupName}`}
      size="large"
    >
      <ErrorBoundary
        componentName="GroupMemberPicker"
        fallback={<div className="p-4 text-gray-500">Unable to load connections. Please close and try again.</div>}
      >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connections..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoadingConnections || isSubmitting}
          />
        </div>

        {/* Selection Count */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} {selectedIds.size === 1 ? 'connection' : 'connections'} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              disabled={isSubmitting}
            >
              Clear
            </button>
          </div>
        )}

        {/* Connections List */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {isLoadingConnections ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {availableConnections.length === 0
                  ? 'All your connections are already in this group'
                  : 'No connections match your search'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConnections.map((connection) => (
                <button
                  key={connection.user_id}
                  onClick={() => handleToggleSelection(connection.user_id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    selectedIds.has(connection.user_id) ? 'bg-blue-50' : ''
                  }`}
                  disabled={isSubmitting}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(connection.user_id)}
                    onChange={() => {}}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />

                  {/* Avatar */}
                  {connection.avatar_url ? (
                    <img
                      src={connection.avatar_url}
                      alt={connection.display_name || connection.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: connection.avatar_bg_color || '#3B82F6' }}
                    >
                      {getAvatarInitials(connection.display_name || connection.username)}
                    </div>
                  )}

                  {/* Name & Username */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">
                      {connection.display_name || connection.username}
                    </p>
                    <p className="text-sm text-gray-500">@{connection.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isSubmitting || selectedIds.size === 0}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add {selectedIds.size > 0 && `(${selectedIds.size})`}
              </>
            )}
          </button>
        </div>
      </div>
      </ErrorBoundary>
    </BizModal>
  );
}
