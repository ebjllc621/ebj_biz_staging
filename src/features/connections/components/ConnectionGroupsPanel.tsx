/**
 * ConnectionGroupsPanel Component
 * Main dashboard panel for managing connection groups
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - Uses branded components and patterns
 * - Client Component ('use client')
 * - Proper loading and error states
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionsListPanel.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UsersRound, Search, BookOpen, Archive, RotateCcw } from 'lucide-react';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupMemberPicker } from './GroupMemberPicker';
import { GroupMembersGrid } from './GroupMembersGrid';
import { GroupTemplatesBrowser } from './GroupTemplatesBrowser';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@core/context/AuthContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ConnectionGroup, GroupMember } from '../types/groups';

export interface ConnectionGroupsPanelProps {
  className?: string;
}

export function ConnectionGroupsPanel({ className = '' }: ConnectionGroupsPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const currentUserId = user ? parseInt(user.id, 10) : 0;
  const [groups, setGroups] = useState<ConnectionGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ConnectionGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [isTemplatesBrowserOpen, setIsTemplatesBrowserOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedGroups, setArchivedGroups] = useState<ConnectionGroup[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users/connections/groups', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setGroups(result.data.groups || []);
      }
    } catch (err) {
      setError('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroupMembers = async (groupId: number) => {
    setIsLoadingMembers(true);
    try {
      const response = await fetch(
        `/api/users/connections/groups/${groupId}/members`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success && result.data) {
        setGroupMembers(result.data.members || []);
      }
    } catch (err) {
      setError('Failed to load members');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleGroupClick = async (group: ConnectionGroup) => {
    setSelectedGroup(group);
    await loadGroupMembers(group.id);
  };

  const handleGroupCreated = (group: ConnectionGroup) => {
    setGroups([group, ...groups]);
  };

  const handleGroupCreatedFromTemplate = (group: ConnectionGroup) => {
    setGroups([group, ...groups]);
    setIsTemplatesBrowserOpen(false);
  };

  const handleArchiveGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to archive this group?')) return;

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        await loadGroups();
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
        }
      }
    } catch (err) {
      setError('Failed to archive group');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedGroup) return;
    if (!confirm('Remove this member from the group?')) return;

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${selectedGroup.id}/members/${memberId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (result.success) {
        await loadGroupMembers(selectedGroup.id);
        await loadGroups(); // Refresh member count
      }
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleMembersAdded = async () => {
    if (selectedGroup) {
      await loadGroupMembers(selectedGroup.id);
      await loadGroups(); // Refresh member count
    }
  };

  const loadArchivedGroups = async () => {
    setIsLoadingArchived(true);
    try {
      const response = await fetch('/api/users/connections/groups?includeArchived=true', {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success && result.data) {
        setArchivedGroups((result.data.groups || []).filter((g: ConnectionGroup) => g.isArchived));
      }
    } catch {
      setError('Failed to load archived groups');
    } finally {
      setIsLoadingArchived(false);
    }
  };

  const handleRestoreGroup = async (groupId: number) => {
    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/restore`,
        { method: 'POST' }
      );
      const result = await response.json();
      if (result.success) {
        await loadGroups();
        await loadArchivedGroups();
      }
    } catch {
      setError('Failed to restore group');
    }
  };

  useEffect(() => {
    if (showArchived) {
      void loadArchivedGroups();
    }
  }, [showArchived]);

  const filteredGroups = groups.filter((group) =>
    searchQuery
      ? group.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <ErrorBoundary
      componentName="ConnectionGroupsPanel"
      fallback={
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm">
          <p>Unable to load connection groups.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
    <section className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Panel Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-biz-navy to-biz-navy/90 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <UsersRound className="w-5 h-5 text-white flex-shrink-0" />
            <h2 className="text-lg font-semibold text-white truncate">Connection Groups</h2>
            <span className="px-2.5 py-0.5 bg-white/20 text-white text-sm font-medium rounded-full flex-shrink-0">
              {groups.length}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowArchived(!showArchived); setIsTemplatesBrowserOpen(false); }}
              className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg transition-colors font-medium text-sm ${
                showArchived ? 'bg-white text-biz-navy' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title="View Archived Groups"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archived</span>
            </button>
            <button
              onClick={() => { setIsTemplatesBrowserOpen(!isTemplatesBrowserOpen); setShowArchived(false); }}
              className="flex items-center gap-2 px-3 py-2 min-h-[44px] bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors font-medium text-sm"
              title="Browse Templates"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-white text-biz-navy rounded-lg hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Group</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Templates Browser (collapsible) */}
      {isTemplatesBrowserOpen && (
        <div className="px-6 py-4 border-b border-gray-200">
          <GroupTemplatesBrowser onCreateFromTemplate={handleGroupCreatedFromTemplate} />
        </div>
      )}

      {/* Archived Groups Section */}
      {showArchived && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Archive className="w-4 h-4 text-gray-500" />
            Archived Groups
          </h3>
          {isLoadingArchived ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : archivedGroups.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No archived groups</p>
          ) : (
            <div className="space-y-2">
              {archivedGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: group.color + '20' }}
                    >
                      <UsersRound className="w-4 h-4" style={{ color: group.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.memberCount} members</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreGroup(group.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Groups List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Your Groups</h3>
              {filteredGroups.length === 0 ? (
                <div className="text-center py-8">
                  <UsersRound className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    {groups.length === 0
                      ? 'No groups yet. Create one to organize your connections!'
                      : 'No groups match your search'}
                  </p>
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const owned = group.userId === currentUserId;
                  return (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isOwner={owned}
                      onClick={() => handleGroupClick(group)}
                      onArchive={owned ? () => handleArchiveGroup(group.id) : undefined}
                      onMessage={() => router.push(`/dashboard/messages?compose=group&groupId=${group.id}&groupName=${encodeURIComponent(group.name)}&groupColor=${encodeURIComponent(group.color)}&groupMemberCount=${group.memberCount}`)}
                      className={selectedGroup?.id === group.id ? 'ring-2 ring-blue-500' : ''}
                    />
                  );
                })
              )}
            </div>

            {/* Group Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {selectedGroup ? `${selectedGroup.name} Members` : 'Select a Group'}
                </h3>
                {selectedGroup && (
                  <button
                    onClick={() => setIsMemberPickerOpen(true)}
                    className="px-3 py-2 min-h-[44px] text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Members
                  </button>
                )}
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedGroup ? (
                <GroupMembersGrid
                  members={groupMembers}
                  onRemove={selectedGroup.userId === currentUserId ? handleRemoveMember : undefined}
                  editable={selectedGroup.userId === currentUserId}
                  showMessageLink={true}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    Select a group to view and manage its members
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {selectedGroup && (
        <GroupMemberPicker
          isOpen={isMemberPickerOpen}
          onClose={() => setIsMemberPickerOpen(false)}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          existingMembers={groupMembers}
          onMembersAdded={handleMembersAdded}
        />
      )}
    </section>
    </ErrorBoundary>
  );
}
