/**
 * TeamManager - Team Members Management
 *
 * @description Manage team members with CRUD operations
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TeamMemberCard } from './team/TeamMemberCard';
import { TeamMemberFormModal } from './team/TeamMemberFormModal';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { Users } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TeamMember {
  id: number;
  listing_id: number;
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  social_links: Record<string, string> | null;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMemberFormData {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  email: string;
  phone: string;
  social_links: {
    facebook: string;
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  is_visible: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

function TeamManagerContent() {
  const { selectedListingId } = useListingContext();

  // State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch team members
  const fetchMembers = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${selectedListingId}/team`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const result = await response.json();
      if (result.success) {
        setMembers(result.data.members || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle create
  const handleCreate = useCallback(async (data: TeamMemberFormData) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/listings/${selectedListingId}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create team member');
      }

      await fetchMembers();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team member');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchMembers]);

  // Handle update
  const handleUpdate = useCallback(async (data: TeamMemberFormData) => {
    if (!selectedListingId || !editingMember) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${selectedListingId}/team/${editingMember.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update team member');
      }

      await fetchMembers();
      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team member');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, editingMember, fetchMembers]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!selectedListingId || !deletingMember) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${selectedListingId}/team/${deletingMember.id}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete team member');
      }

      await fetchMembers();
      setDeletingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team member');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedListingId, deletingMember, fetchMembers]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && members.length === 0) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
        <button
          onClick={() => fetchMembers()}
          className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Team Members List */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Team Members Yet"
          description="Add your team members to showcase the people behind your business"
          action={{
            label: 'Add First Member',
            onClick: () => setShowCreateModal(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onEdit={() => setEditingMember(member)}
              onDelete={() => setDeletingMember(member)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <TeamMemberFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Modal */}
      {editingMember && (
        <TeamMemberFormModal
          isOpen={true}
          onClose={() => setEditingMember(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={{
            name: editingMember.name,
            role: editingMember.role || '',
            bio: editingMember.bio || '',
            photo_url: editingMember.photo_url || '',
            email: editingMember.email || '',
            phone: editingMember.phone || '',
            social_links: {
              facebook: editingMember.social_links?.facebook || '',
              instagram: editingMember.social_links?.instagram || '',
              twitter: editingMember.social_links?.twitter || '',
              linkedin: editingMember.social_links?.linkedin || ''
            },
            is_visible: editingMember.is_visible
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingMember(null)}
          onConfirm={handleDelete}
          itemType="team member"
          itemName={deletingMember.name}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

/**
 * TeamManager - Wrapped with ErrorBoundary
 */
export function TeamManager() {
  return (
    <ErrorBoundary componentName="TeamManager">
      <TeamManagerContent />
    </ErrorBoundary>
  );
}

export default TeamManager;
