/**
 * MembershipsSection - Professional Memberships & Certifications Component
 *
 * Allows users to add, edit, and remove professional memberships,
 * certifications, and licenses.
 *
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3C_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Edit2, Award, Loader2 } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import type { MembershipInterest } from '../types/user-interests';

export interface MembershipsSectionProps {
  /** Current memberships */
  memberships: MembershipInterest[];
  /** Callback when memberships change */
  onMembershipsChange: (_memberships: MembershipInterest[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Maximum number of memberships allowed */
  maxMemberships?: number;
  /** Target user's username for API calls (admin editing support) */
  username: string;
}

interface MembershipFormData {
  membership_name: string;
  membership_description: string;
}

const INITIAL_FORM: MembershipFormData = {
  membership_name: '',
  membership_description: ''
};

export function MembershipsSection({
  memberships,
  onMembershipsChange,
  disabled = false,
  maxMemberships = 10,
  username
}: MembershipsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<MembershipFormData>(INITIAL_FORM);
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
    if (!formData.membership_name.trim()) {
      setError('Membership name is required');
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
          membership_name: formData.membership_name.trim(),
          membership_description: formData.membership_description.trim() || undefined
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to save membership');
      }

      const result = await response.json();
      if (result.success && result.data.interest) {
        if (isEditing) {
          onMembershipsChange(memberships.map(m => m.id === editingId ? result.data.interest : m));
        } else {
          onMembershipsChange([...memberships, result.data.interest]);
        }
        resetForm();
      }
    } catch (err) {
      console.error('Membership save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save membership');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, editingId, memberships, onMembershipsChange, resetForm, username]);

  const handleEdit = useCallback((membership: MembershipInterest) => {
    setFormData({
      membership_name: membership.membership_name,
      membership_description: membership.membership_description || ''
    });
    setEditingId(membership.id);
    setShowForm(true);
    setError(null);
  }, []);

  const handleRemove = useCallback(async (membershipId: number) => {
    try {
      // Uses username-based endpoint to support admin editing other users
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/interests/${membershipId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        onMembershipsChange(memberships.filter(m => m.id !== membershipId));
      } else {
        setError('Failed to remove membership');
      }
    } catch (err) {
      console.error('Remove membership error:', err);
      setError('Failed to remove membership');
    }
  }, [memberships, onMembershipsChange, username]);

  const canAddMore = memberships.length < maxMemberships;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#022641]" />
          <label className="font-medium text-sm text-[#022641]">
            Memberships & Certifications
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
            Add Membership
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Add professional memberships, certifications, or licenses
      </p>

      {/* Existing Memberships */}
      {memberships.length > 0 && (
        <div className="space-y-2">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className="p-3 bg-white border border-gray-200 rounded-lg flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="font-medium text-[#022641] text-sm">{membership.membership_name}</div>
                {membership.membership_description && (
                  <div className="text-xs text-gray-500 mt-1">{membership.membership_description}</div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => handleEdit(membership)}
                  disabled={disabled || isSubmitting}
                  className="p-1 text-gray-400 hover:text-[#022641] transition-colors"
                  aria-label={`Edit ${membership.membership_name}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(membership.id)}
                  disabled={disabled || isSubmitting}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${membership.membership_name}`}
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
              Membership/Certification Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.membership_name}
              onChange={(e) => setFormData(prev => ({ ...prev, membership_name: e.target.value }))}
              placeholder="e.g., AWS Certified Solutions Architect"
              disabled={isSubmitting}
              maxLength={255}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200
                       disabled:bg-gray-100 transition shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formData.membership_description}
              onChange={(e) => setFormData(prev => ({ ...prev, membership_description: e.target.value }))}
              placeholder="Describe this certification or membership"
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
              disabled={isSubmitting || !formData.membership_name.trim()}
              className="px-4 py-1.5 bg-[#022641] text-white text-sm rounded-lg
                       hover:bg-[#033a5c] transition-colors disabled:opacity-50
                       flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
              {editingId ? 'Update' : 'Add'} Membership
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-500">
        {memberships.length} of {maxMemberships} memberships added
      </p>
    </div>
  );
}

export default MembershipsSection;
