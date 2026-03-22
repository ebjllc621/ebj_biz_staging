/**
 * GroupsSection - Groups & Organizations Management Component
 *
 * Allows users to add, edit, and remove group memberships
 * with name, purpose, and role fields.
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3C_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Edit2, Users, Loader2 } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import type { GroupInterest } from '../types/user-interests';

export interface GroupsSectionProps {
  /** Current groups */
  groups: GroupInterest[];
  /** Callback when groups change */
  onGroupsChange: (_groups: GroupInterest[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Maximum number of groups allowed */
  maxGroups?: number;
  /** Target user's username for API calls (admin editing support) */
  username: string;
}

interface GroupFormData {
  group_name: string;
  group_purpose: string;
  group_role: string;
}

const INITIAL_FORM: GroupFormData = {
  group_name: '',
  group_purpose: '',
  group_role: ''
};

export function GroupsSection({
  groups,
  onGroupsChange,
  disabled = false,
  maxGroups = 10,
  username
}: GroupsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<GroupFormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.group_name.trim()) {
      setError('Group name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        throw new Error('CSRF token not available');
      }

      const isEditing = editingId !== null;
      // Uses username-based endpoint to support admin editing other users
      const url = isEditing
        ? `/api/users/${encodeURIComponent(username)}/interests/${editingId}`
        : `/api/users/${encodeURIComponent(username)}/interests`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          group_name: formData.group_name.trim(),
          group_purpose: formData.group_purpose.trim() || undefined,
          group_role: formData.group_role.trim() || undefined
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to save group');
      }

      const result = await response.json();
      if (result.success && result.data.interest) {
        if (isEditing) {
          onGroupsChange(groups.map(g => g.id === editingId ? result.data.interest : g));
        } else {
          onGroupsChange([...groups, result.data.interest]);
        }
        resetForm();
      }
    } catch (err) {
      console.error('Group save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingId, groups, onGroupsChange, resetForm, username]);

  const handleEdit = useCallback((group: GroupInterest) => {
    setFormData({
      group_name: group.group_name,
      group_purpose: group.group_purpose || '',
      group_role: group.group_role || ''
    });
    setEditingId(group.id);
    setShowForm(true);
    setError(null);
  }, []);

  const handleRemove = useCallback(async (groupId: number) => {
    try {
      // Uses username-based endpoint to support admin editing other users
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/interests/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        onGroupsChange(groups.filter(g => g.id !== groupId));
      } else {
        setError('Failed to remove group');
      }
    } catch (err) {
      console.error('Remove group error:', err);
      setError('Failed to remove group');
    }
  }, [groups, onGroupsChange, username]);

  const canAddMore = groups.length < maxGroups;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#022641]" />
          <label className="font-medium text-sm text-[#022641]">
            Groups & Organizations
          </label>
        </div>
        {!showForm && canAddMore && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={disabled}
            className="text-sm text-[#ed6437] hover:text-[#d55a2f] font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Group
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Add clubs, organizations, or communities you&apos;re involved with
      </p>

      {/* Existing Groups */}
      {groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-3 bg-white border border-gray-200 rounded-lg flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="font-medium text-[#022641] text-sm">{group.group_name}</div>
                {group.group_role && (
                  <div className="text-xs text-[#ed6437] mt-0.5">{group.group_role}</div>
                )}
                {group.group_purpose && (
                  <div className="text-xs text-gray-500 mt-1">{group.group_purpose}</div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => handleEdit(group)}
                  disabled={disabled || isSubmitting}
                  className="p-1 text-gray-400 hover:text-[#022641] transition-colors"
                  aria-label={`Edit ${group.group_name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(group.id)}
                  disabled={disabled || isSubmitting}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${group.group_name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.group_name}
              onChange={(e) => setFormData(prev => ({ ...prev, group_name: e.target.value }))}
              placeholder="e.g., Local Business Network"
              disabled={isSubmitting}
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                       disabled:bg-gray-100 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Your Role (optional)
            </label>
            <input
              type="text"
              value={formData.group_role}
              onChange={(e) => setFormData(prev => ({ ...prev, group_role: e.target.value }))}
              placeholder="e.g., Member, President, Volunteer"
              disabled={isSubmitting}
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                       disabled:bg-gray-100 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Purpose/Description (optional)
            </label>
            <textarea
              value={formData.group_purpose}
              onChange={(e) => setFormData(prev => ({ ...prev, group_purpose: e.target.value }))}
              placeholder="What is this group about?"
              disabled={isSubmitting}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                       disabled:bg-gray-100 transition shadow-sm resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.group_name.trim()}
              className="px-4 py-1.5 bg-[#022641] text-white text-sm rounded-lg
                       hover:bg-[#033a5c] transition-colors disabled:opacity-50
                       flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingId ? 'Update' : 'Add'} Group
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-500">
        {groups.length} of {maxGroups} groups added
      </p>
    </div>
  );
}

export default GroupsSection;
